import { useState, type MouseEvent, type ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  navItems: { key: string; label: string }[];
  currentKey: string;
  onNavigate(key: string): void;
  user: { name: string; title: string };
  onSignOut(): void;
  onSearch?(query: string): void;
}

export function AppShell({
  children,
  navItems,
  currentKey,
  onNavigate,
  user,
  onSignOut,
  onSearch,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const go = (key: string) => (e: MouseEvent) => {
    e.preventDefault();
    setNavOpen(false);
    onNavigate(key);
  };
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
        <span className="shell-brand" aria-hidden="true" />
        {onSearch && (
          <form
            className="shell-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(query.trim());
            }}
          >
            <input
              className="input"
              type="search"
              placeholder="Search parts"
              aria-label="Search parts"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm" type="submit" aria-label="Search">
              &#128269;
            </button>
          </form>
        )}
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          title={`${user.name}, ${user.title}`}
          onClick={onSignOut}
        >
          Sign out
        </button>
      </header>
      <div className="shell-body">
        <nav className={navOpen ? 'shell-nav is-open' : 'shell-nav'} id="shell-nav" aria-label="Main">
          <ul>
            {navItems.map((item) => (
              <li key={item.key}>
                <a
                  href={`/${item.key}`}
                  aria-current={item.key === currentKey ? 'page' : undefined}
                  onClick={go(item.key)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
