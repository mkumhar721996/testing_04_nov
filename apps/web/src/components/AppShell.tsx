import { useState, type ReactNode } from 'react';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'items', label: 'Items' },
  { key: 'activity', label: 'Activity' },
  { key: 'settings', label: 'Settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="shell">
      <header className="shell-header">
        <button
          className="btn btn-ghost btn-icon shell-menu-btn"
          type="button"
          aria-controls="shell-nav"
          aria-expanded={navOpen}
          aria-label="Menu"
          onClick={() => setNavOpen((open) => !open)}
        >
          &#9776;
        </button>
        <a className="shell-brand" href="/">
          Workspace
        </a>
        <a className="btn btn-ghost btn-sm" href="/">
          Account
        </a>
      </header>
      <div className="shell-body">
        <nav
          className={navOpen ? 'shell-nav is-open' : 'shell-nav'}
          id="shell-nav"
          aria-label="Main"
        >
          <ul>
            {NAV.map((item) => (
              <li key={item.key}>
                <a href="/" aria-current={item.key === 'items' ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="shell-content">{children}</main>
      </div>
      <footer className="shell-footer">
        <span>Workspace</span>
      </footer>
    </div>
  );
}
