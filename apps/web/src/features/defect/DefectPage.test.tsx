import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { DefectDetail, Status } from '../../api/defects';
import { DefectPage } from './DefectPage';

const ALL_STATUSES: Status[] = [
  'New',
  'Triaged',
  'In progress',
  'Resolved',
  'Verified',
  'Closed',
  'Rejected',
];

const defect = (over: Partial<DefectDetail> = {}): DefectDetail => ({
  id: 'd-1',
  key: 'DEF-14',
  title: 'Login button unresponsive on Safari',
  status: 'Triaged',
  rowVersion: 1,
  ownerId: null,
  ownerName: null,
  comments: [],
  availableMoves: [],
  ...over,
});

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(handler);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('DefectPage', () => {
  it('shows the current status for every status (AC17)', async () => {
    for (const status of ALL_STATUSES) {
      mockFetch(() => json(200, defect({ status })));
      const { unmount } = render(<DefectPage id="d-1" />);
      expect(await screen.findByText(`Status: ${status}`)).toBeInTheDocument();
      unmount();
    }
  });

  it('offers exactly the moves the server returns (AC1)', async () => {
    mockFetch(() =>
      json(
        200,
        defect({
          status: 'Resolved',
          availableMoves: [{ to: 'In progress', label: 'Record failed fix', requiresReason: false }],
        }),
      ),
    );
    render(<DefectPage id="d-1" />);
    expect(await screen.findByRole('button', { name: 'Record failed fix' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('shows the no-moves text for a Rejected defect (AC4)', async () => {
    mockFetch(() => json(200, defect({ status: 'Rejected' })));
    render(<DefectPage id="d-1" />);
    expect(
      await screen.findByText('No status move is available for a Rejected defect.'),
    ).toBeInTheDocument();
  });

  it('tells a user with no moves so', async () => {
    mockFetch(() => json(200, defect({ status: 'Closed' })));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No status move is available to you.',
    );
  });

  it('shows reason comments as plain text, keeping line breaks (AC5, AC8)', async () => {
    mockFetch(() =>
      json(
        200,
        defect({
          comments: [
            {
              id: 'c1',
              authorName: 'Lead A.',
              body: 'Rejected: Duplicate of DEF-12',
              createdAt: '2026-11-05T10:00:00Z',
            },
            { id: 'c2', authorName: 'P', body: '<b>x</b>\nsecond line', createdAt: '2026-11-05T10:00:00Z' },
          ],
        }),
      ),
    );
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText(/Duplicate of DEF-12/)).toBeInTheDocument();
    expect(screen.getByText(/<b>x<\/b>/)).toBeInTheDocument();
    expect(document.querySelector('.comment b')).toBeNull();
  });

  it('shows an empty comments line', async () => {
    mockFetch(() => json(200, defect()));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
  });

  it('rejects with a reason: sends the loaded version and re-renders (AC3, AC5)', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === 'POST')
        return json(
          200,
          defect({
            status: 'Rejected',
            rowVersion: 2,
            comments: [
              { id: 'c', authorName: 'Dev Lead', body: 'Rejected: Duplicate of DEF-12', createdAt: '2026-11-05T10:00:00Z' },
            ],
          }),
        );
      return json(
        200,
        defect({ availableMoves: [{ to: 'Rejected', label: 'Reject', requiresReason: true }] }),
      );
    });
    render(<DefectPage id="d-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Duplicate of DEF-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject defect' }));
    expect(await screen.findByText('Status: Rejected')).toBeInTheDocument();
    expect(screen.getByText(/Duplicate of DEF-12/)).toBeInTheDocument();
    expect(screen.getByText('Defect rejected. Reason saved as a comment.')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      to: 'Rejected',
      expectedVersion: 1,
      reason: 'Duplicate of DEF-12',
    });
  });

  it('runs a move without a reason directly', async () => {
    mockFetch((url, init) =>
      init?.method === 'POST'
        ? json(200, defect({ status: 'Resolved', rowVersion: 2 }))
        : json(
            200,
            defect({
              status: 'In progress',
              availableMoves: [{ to: 'Resolved', label: 'Mark Resolved', requiresReason: false }],
            }),
          ),
    );
    render(<DefectPage id="d-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Resolved' }));
    expect(await screen.findByText('Status changed to Resolved.')).toBeInTheDocument();
  });

  it('shows the current status with a conflict banner on 409 (AC23, AC24)', async () => {
    mockFetch((url, init) =>
      init?.method === 'POST'
        ? json(409, {
            message: 'changed',
            currentStatus: 'Verified',
            defect: defect({ status: 'Verified', rowVersion: 2 }),
          })
        : json(
            200,
            defect({
              status: 'Resolved',
              availableMoves: [{ to: 'In progress', label: 'Record failed fix', requiresReason: false }],
            }),
          ),
    );
    render(<DefectPage id="d-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Record failed fix' }));
    expect(await screen.findByText('Status: Verified')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Another user changed this defect');
  });

  it('explains a 403', async () => {
    mockFetch((url, init) =>
      init?.method === 'POST'
        ? json(403, {})
        : json(
            200,
            defect({
              status: 'Verified',
              availableMoves: [{ to: 'Closed', label: 'Close', requiresReason: false }],
            }),
          ),
    );
    render(<DefectPage id="d-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent("You can't make that move."),
    );
  });

  it('shows an error with Try again when loading fails', async () => {
    mockFetch(() => json(404, {}));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
