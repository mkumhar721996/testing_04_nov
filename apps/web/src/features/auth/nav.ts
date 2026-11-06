import type { Role } from '../../api/auth';

export type NavKey = 'search' | 'cart' | 'orders';
export interface NavItem {
  key: NavKey;
  label: string;
}

const SEARCH: NavItem = { key: 'search', label: 'Search' };
const CART: NavItem = { key: 'cart', label: 'Cart' };
const ORDERS: NavItem = { key: 'orders', label: 'Orders' };

// The only place a role's menu is decided.
export function navForRole(role: Role): NavItem[] {
  return role === 'csr' ? [SEARCH, ORDERS] : [SEARCH, CART, ORDERS];
}
