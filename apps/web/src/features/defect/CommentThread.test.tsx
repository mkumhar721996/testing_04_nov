import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { DefectComment, DefectDetail } from '../../api/defects';
import { DefectPage } from './DefectPage';

const comment = (over: Partial<DefectComment> = {}): DefectComment => ({
  id: 'c1',
  authorName: 'Dev Rao',
  body: 'first',
  createdAt: '2026-11-05T14:30:00.000Z',
  ...over,
});

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
  viewerName: 'Tess Tester',
  ...over,
});

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(handler);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const list = () => screen.getByRole('list', { name: 'Comments, oldest first' });
const posts = (fn: ReturnType<typeof mockFetch>) =>
  fn.mock.calls.filter(([, init]) => init?.method === 'POST');

afterEach(() => vi.unstubAllGlobals());

describe('comment thread', () => {
  it('posts a comment and shows it with a toast (AC1)', async () => {
    const fetchMock = mockFetch((url, init) =>
      init?.method === 'POST'
        ? json(201, defect({ comments: [comment({ body: 'Retest on Chrome 120' })] }))
        : json(200, defect()),
    );
    render(<DefectPage id="d-1" />);
    fireEvent.change(await screen.findByLabelText('Add a comment'), {
      target: { value: 'Retest on Chrome 120' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByText('Retest on Chrome 120')).toBeInTheDocument();
    expect(await screen.findByText('Comment posted')).toBeInTheDocument();
    const [url, init] = posts(fetchMock)[0];
    expect(url).toContain('/defects/d-1/comments');
    expect(JSON.parse(init!.body as string)).toEqual({ text: 'Retest on Chrome 120' });
    expect(screen.getByLabelText('Add a comment')).toHaveValue('');
  });

  it('lists comments in the order the server returns them (AC2)', async () => {
    mockFetch(() =>
      json(200, defect({ comments: [comment({ id: 'a', body: 'first' }), comment({ id: 'b', body: 'second' })] })),
    );
    render(<DefectPage id="d-1" />);
    await screen.findByText('Comments (2)');
    const items = within(list()).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('first');
    expect(items[1]).toHaveTextContent('second');
  });

  it('shows an empty state when a defect has no comments (AC3)', async () => {
    mockFetch(() => json(200, defect()));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
  });

  it('shows a rejection reason without its stored prefix (AC4)', async () => {
    mockFetch(() => json(200, defect({ comments: [comment({ body: 'Rejected: Duplicate of DEF-12' })] })));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText('Duplicate of DEF-12')).toBeInTheDocument();
    expect(screen.getByText('Rejection reason')).toBeInTheDocument();
  });

  it('shows a reopen reason (AC5)', async () => {
    mockFetch(() => json(200, defect({ comments: [comment({ body: 'Reopened: Regression in 2.3' })] })));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText('Regression in 2.3')).toBeInTheDocument();
    expect(screen.getByText('Reopen reason')).toBeInTheDocument();
  });

  it('offers no edit or delete control (AC6)', async () => {
    mockFetch(() => json(200, defect({ comments: [comment()] })));
    render(<DefectPage id="d-1" />);
    await screen.findByText('first');
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit|delete/i })).not.toBeInTheDocument();
    expect(screen.getByText('Oldest first. Comments cannot be edited or deleted.')).toBeInTheDocument();
  });

  it('shows the author name and the posting name (AC7)', async () => {
    mockFetch(() => json(200, defect({ comments: [comment()] })));
    render(<DefectPage id="d-1" />);
    expect(await screen.findByText('Dev Rao')).toBeInTheDocument();
    expect(screen.getByText(/Posting as Tess Tester\./)).toBeInTheDocument();
  });

  it('shows the date and time posted (AC8)', async () => {
    mockFetch(() => json(200, defect({ comments: [comment()] })));
    const { container } = render(<DefectPage id="d-1" />);
    await screen.findByText('first');
    const time = container.querySelector('li time')!;
    expect(time).toHaveAttribute('datetime', '2026-11-05T14:30:00.000Z');
    expect(time.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it.each(['', '   '])('refuses blank text %j with an error and no request (AC9, AC10)', async (text) => {
    const fetchMock = mockFetch(() => json(200, defect({ comments: [comment()] })));
    render(<DefectPage id="d-1" />);
    const field = await screen.findByLabelText('Add a comment');
    fireEvent.change(field, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(
      await screen.findByText('Comment cannot be empty. Enter some text, then post again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your comment was not posted');
    expect(posts(fetchMock)).toHaveLength(0);
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps the typed text and explains a failed post (AC10)', async () => {
    mockFetch((url, init) => (init?.method === 'POST' ? json(500, {}) : json(200, defect({ comments: [comment()] }))));
    render(<DefectPage id="d-1" />);
    fireEvent.change(await screen.findByLabelText('Add a comment'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByText('The comment could not be saved. Try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Add a comment')).toHaveValue('hello');
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
  });
});
