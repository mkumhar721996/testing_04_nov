import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../cart/CartProvider';
import { PartSearch } from './PartSearch';

const gasket = { partNumber: 'GSK-FL-DN50', description: 'Flange gasket, DN50', sapInstance: 'SAP A (EU)', stock: 10 };
const bearing = { partNumber: 'BRG-6305-ZZ', description: 'Deep groove ball bearing, shielded', sapInstance: 'SAP A (EU)', stock: 58 };
const filter = { partNumber: 'FLT-HY-2210', description: 'Hydraulic filter', sapInstance: 'SAP B (US)', stock: 0 };

const stubSearch = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: ok ? 200 : 502 }))));

function renderSearch(role: 'buyer' | 'csr' = 'buyer') {
  return render(
    <CartProvider>
      <PartSearch role={role} onViewCart={() => {}} />
    </CartProvider>,
  );
}

async function search(term: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Part number or description' }), { target: { value: term } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
}

afterEach(() => vi.unstubAllGlobals());

describe('PartSearch', () => {
  it('shows instance A results and a notice when B is unreachable (AC1, AC2)', async () => {
    stubSearch({ results: [bearing], unavailableSources: ['SAP B (US)'] });
    renderSearch();
    await search('6305');
    expect(await screen.findByText('BRG-6305-ZZ')).toBeInTheDocument();
    expect(screen.getByText(/One source is unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('SAP B (US) did not respond');
  });

  it('shows no notice when every source answered', async () => {
    stubSearch({ results: [bearing], unavailableSources: [] });
    renderSearch();
    await search('6305');
    await screen.findByText('BRG-6305-ZZ');
    expect(screen.queryByText(/One source is unavailable/)).not.toBeInTheDocument();
  });

  it('shows parts from both instances (AC3)', async () => {
    stubSearch({ results: [bearing, filter], unavailableSources: [] });
    renderSearch();
    await search('b');
    expect(await screen.findByText('BRG-6305-ZZ')).toBeInTheDocument();
    expect(screen.getByText('FLT-HY-2210')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Search results' })).getAllByRole('row')).toHaveLength(3);
  });

  it('shows no rows when nothing is returned (AC4)', async () => {
    stubSearch({ results: [], unavailableSources: [] });
    renderSearch();
    await search('valve');
    expect(await screen.findByText(/No parts found for/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Search results' })).not.toBeInTheDocument();
  });

  it('shows part number, description, instance and stock per row (AC5)', async () => {
    stubSearch({ results: [gasket], unavailableSources: [] });
    renderSearch();
    await search('gsk');
    const row = await screen.findByRole('row', { name: /GSK-FL-DN50/ });
    expect(within(row).getByText('Flange gasket, DN50')).toBeInTheDocument();
    expect(within(row).getByText('SAP A (EU)')).toBeInTheDocument();
    expect(within(row).getByText('10 in stock')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Search results' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Part number',
      'Description',
      'SAP instance',
      'Stock availability',
      'Quantity',
    ]);
  });

  it('adds a result to the cart (AC6)', async () => {
    stubSearch({ results: [gasket], unavailableSources: [] });
    renderSearch();
    await search('gsk');
    fireEvent.click(await screen.findByRole('button', { name: 'Add GSK-FL-DN50 from SAP A (EU) to cart' }));
    expect(within(screen.getByRole('region', { name: 'In your cart' })).getByText('GSK-FL-DN50')).toBeInTheDocument();
  });

  it('refuses 11 against stock 10 and shows the stock (AC7, AC8)', async () => {
    stubSearch({ results: [gasket], unavailableSources: [] });
    renderSearch();
    await search('gsk');
    const input = await screen.findByRole('textbox', { name: /Quantity for GSK-FL-DN50/ });
    fireEvent.change(input, { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /Add GSK-FL-DN50/ }));
    expect(screen.queryByRole('region', { name: 'In your cart' })).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Stock shown is 10/)).toBeInTheDocument();
    expect(screen.getByText('10 in stock')).toBeInTheDocument();
  });

  it('adds 10 against stock 10 (AC9)', async () => {
    stubSearch({ results: [gasket], unavailableSources: [] });
    renderSearch();
    await search('gsk');
    fireEvent.change(await screen.findByRole('textbox', { name: /Quantity for GSK-FL-DN50/ }), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add GSK-FL-DN50/ }));
    const cart = screen.getByRole('region', { name: 'In your cart' });
    expect(within(cart).getByRole('row', { name: /GSK-FL-DN50/ })).toHaveTextContent('10');
    expect(screen.getByText('10 × GSK-FL-DN50 (SAP A (EU)) added to your cart.')).toBeInTheDocument();
  });

  it('shows a busy table while loading', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    renderSearch();
    await search('gsk');
    expect(screen.getByRole('table', { name: 'Loading results' })).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error and retries', async () => {
    stubSearch({}, false);
    renderSearch();
    await search('gsk');
    expect(await screen.findByRole('alert')).toHaveTextContent("The search didn't finish");
    stubSearch({ results: [gasket], unavailableSources: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Search again' }));
    expect(await screen.findByText('GSK-FL-DN50')).toBeInTheDocument();
  });

  it('gives a CSR no quantity or add button', async () => {
    stubSearch({ results: [gasket], unavailableSources: [] });
    renderSearch('csr');
    await search('gsk');
    await screen.findByText('GSK-FL-DN50');
    expect(screen.queryByRole('button', { name: /Add .* to cart/ })).not.toBeInTheDocument();
  });
});
