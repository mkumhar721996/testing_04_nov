import { ReactNode, useState } from 'react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'items', label: 'Items' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

// Only Settings is wired in this story; the other entries are inert links.
const CURRENT = 'settings';

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="shell">
      <header className="shell-header">
        <button
          type="button"
          className="btn btn-ghost btn-icon shell-menu-btn"
          aria-controls="shell-nav"
          aria-expanded={navOpen}
          aria-label="Menu"
          onClick={() => setNavOpen((open) => !open)}
        >
          &#9776;
        </button>
        <a className="shell-brand" href="#">
          Workspace
        </a>
        <a className="btn btn-ghost btn-sm" href="#">
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
              <li key={item.id}>
                <a href="#" aria-current={item.id === CURRENT ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="shell-content">{children}</main>
      </div>
      <footer className="shell-footer">
        <span>&copy; Workspace</span>
        <ul>
          <li>
            <a href="#">Help</a>
          </li>
          <li>
            <a href="#">Privacy</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}
