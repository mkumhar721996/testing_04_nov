import { MainNav } from './MainNav';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function TopBar({ name }: { name: string }) {
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <strong className="logo">Harbor Bank</strong>
        <MainNav />
        <div className="top-actions">
          <button type="button" className="btn btn-secondary btn-icon" aria-label="Notifications">
            <svg className="icon" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <button type="button" className="avatar-btn" aria-label={`Account: ${name}`}>
            <span className="avatar" aria-hidden="true">
              {initials(name)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
