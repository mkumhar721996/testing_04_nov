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
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  buyer: [SEARCH, CART, ORDERS],
  admin: [SEARCH, CART, ORDERS],
  csr: [SEARCH, ORDERS],
};

// An unknown role gets no navigation at all.
export function navForRole(role: Role): NavItem[] {
  return NAV_BY_ROLE[role] ?? [];
}
