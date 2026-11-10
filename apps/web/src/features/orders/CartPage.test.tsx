import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartPage } from './CartPage';
import { childA, failedB, order } from './fixtures';

const cartLines = [
  { partNumber: 'BRK-PD-12', description: 'Brake pad set', quantity: 2, sapInstance: 'SAP A (EU)', stock: 40 },
  { partNumber: 'CPL-QD-38', description: 'Quick coupling', quantity: 4, sapInstance: 'SAP B (US)', stock: 12 },
];

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

function stubApi(post: () => Promise<Response>) {
  let cart: unknown[] = cartLines;
  const f = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return post().then((r) => {
        if (r.ok) cart = [];
        return r;
      });
    }
    return json(cart);
  });
  vi.stubGlobal('fetch', f);
  return f;
}

const renderCart = () => render(<CartPage onSearch={vi.fn()} onViewOrders={vi.fn()} />);

describe('CartPage', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('shows the lines and a single primary action', async () => {
    stubApi(() => json(order([childA])));
    const { container } = renderCart();
    expect(await screen.findByRole('table', { name: 'Cart lines' })).toBeInTheDocument();
    expect(screen.getByText('2 lines from 2 SAP instances')).toBeInTheDocument();
    expect(container.querySelectorAll('.btn-primary')).toHaveLength(1);
  });

  it('shows the confirmation after placing the order (AC1)', async () => {
    stubApi(() => json(order([childA, failedB])));
    renderCart();
    fireEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByRole('heading', { name: /order confirmation/i })).toBeInTheDocument();
  });

  it('disables the button while placing', async () => {
    stubApi(() => new Promise(() => {}));
    renderCart();
    fireEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByRole('button', { name: 'Placing order…' })).toBeDisabled();
  });

  it('shows an empty cart after placing (AC6)', async () => {
    stubApi(() => json(order([childA])));
    renderCart();
    fireEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to cart' }));
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Cart lines' })).not.toBeInTheDocument();
  });

  it('keeps the cart and explains when placing fails', async () => {
    stubApi(() => json({}, 500));
    renderCart();
    fireEvent.click(await screen.findByRole('button', { name: 'Place order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t place your order. Your cart is unchanged and nothing was ordered. Check your connection and select Place order again.',
    );
    expect(screen.getByRole('table', { name: 'Cart lines' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled();
  });
});
