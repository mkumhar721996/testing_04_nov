import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { CartLine } from '../../api/cart';
import { CartPage } from './CartPage';

const lineA: CartLine = {
  id: 'l-a',
  partNumber: 'AX-4410-22',
  description: 'Hydraulic seal kit, 40mm',
  sapInstance: 'SAP A (EU)',
  stockShown: 24,
  quantity: 2,
};
const lineB: CartLine = {
  id: 'l-b',
  partNumber: 'BR-7731-05',
  description: 'Brake pad set, front',
  sapInstance: 'SAP B (US)',
  stockShown: 10,
  quantity: 2,
};

const json = (status: number, body?: unknown) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));

function mockFetch(lines: CartLine[], other?: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn((url: string, init: RequestInit = {}) =>
    init.method && other ? other(url, init) : json(200, { lines }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

const typeQty = (part: string, value: string) => {
  const input = screen.getByLabelText(`Qty for ${part}`) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.form!);
};

afterEach(() => vi.unstubAllGlobals());

describe('CartPage', () => {
  it('shows lines from every SAP instance in one list with their details', async () => {
    mockFetch([lineA, lineB]);
    render(<CartPage onSearch={() => {}} />);
    expect(await screen.findByText('AX-4410-22')).toBeInTheDocument();
    expect(screen.getByText('BR-7731-05')).toBeInTheDocument();
    expect(screen.getByText('Brake pad set, front')).toBeInTheDocument();
    expect(screen.getByText('SAP A (EU)')).toBeInTheDocument();
    expect(screen.getByText('SAP B (US)')).toBeInTheDocument();
    expect(screen.getByText('In stock: 10')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2 lines')).toBeInTheDocument();
  });

  it('shows no price and no Ship To', async () => {
    mockFetch([lineA]);
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('AX-4410-22');
    expect(screen.queryByText(/price|\$|€|£/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ship to/i)).not.toBeInTheDocument();
  });

  it('shows a loading status, then an error with a working retry', async () => {
    let fail = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => (fail ? json(500, {}) : json(200, { lines: [lineA] }))),
    );
    render(<CartPage onSearch={() => {}} />);
    expect(screen.getByRole('status', { name: 'Loading your cart' })).toBeInTheDocument();
    expect(await screen.findByText('We couldn’t load your cart.')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('AX-4410-22')).toBeInTheDocument();
  });

  it('shows the empty state with a Search parts button', async () => {
    mockFetch([]);
    const onSearch = vi.fn();
    render(<CartPage onSearch={onSearch} />);
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search parts' }));
    expect(onSearch).toHaveBeenCalled();
  });

  it('changes quantity 2 to 5', async () => {
    mockFetch([lineA], () => json(200, { ...lineA, quantity: 5 }));
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('AX-4410-22');
    typeQty('AX-4410-22', '5');
    expect(await screen.findByText('Cart updated.')).toBeInTheDocument();
    expect(screen.getByLabelText('Qty for AX-4410-22')).toHaveValue('5');
  });

  it('accepts exactly the stock shown', async () => {
    mockFetch([lineB], () => json(200, { ...lineB, quantity: 10 }));
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('BR-7731-05');
    typeQty('BR-7731-05', '10');
    await screen.findByText('Cart updated.');
    expect(screen.getByLabelText('Qty for BR-7731-05')).toHaveValue('10');
  });

  it('refuses a quantity above stock, keeps 2 and shows the stock', async () => {
    mockFetch([lineB], () => json(409, { message: 'Only 10 in stock.', stock: 10 }));
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('BR-7731-05');
    typeQty('BR-7731-05', '11');
    expect(
      await screen.findByText('Only 10 in stock for BR-7731-05. Quantity kept at 2.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Qty for BR-7731-05')).toHaveValue('2');
    expect(screen.getByText('In stock: 10')).toBeInTheDocument();
  });

  it.each(['0', 'abc'])('shows an error for %j and sends nothing', async (value) => {
    const fetchMock = mockFetch([lineA]);
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('AX-4410-22');
    typeQty('AX-4410-22', value);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a whole number greater than 0. Quantity stays at 2.',
    );
    expect(screen.getByLabelText('Qty for AX-4410-22')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/cart/lines'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('removes a line and shows the empty state after the last one', async () => {
    mockFetch([lineA], () => json(204));
    render(<CartPage onSearch={() => {}} />);
    await screen.findByText('AX-4410-22');
    fireEvent.click(screen.getByRole('button', { name: 'Remove AX-4410-22' }));
    await waitFor(() => expect(screen.queryByText('AX-4410-22')).not.toBeInTheDocument());
    expect(screen.getByText('Hydraulic seal kit, 40mm removed from your cart.')).toBeInTheDocument();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });
});
