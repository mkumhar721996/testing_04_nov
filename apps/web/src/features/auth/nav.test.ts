import { navForRole } from './nav';

describe('navForRole', () => {
  it.each(['buyer', 'admin'] as const)('offers search, cart and orders to %s', (role) => {
    expect(navForRole(role).map((i) => i.key)).toEqual(['search', 'cart', 'orders']);
  });
  it('offers an unknown role no navigation', () => {
    expect(navForRole('foo' as never)).toEqual([]);
  });
  it('offers csr search and orders only', () => {
    expect(navForRole('csr').map((i) => i.key)).toEqual(['search', 'orders']);
  });
});
