const placeholderItems = [
  { id: 'loans', label: 'Loans' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'documents', label: 'Documents' },
  { id: 'reports', label: 'Reports' },
];

export function MainNav() {
  return (
    <nav className="main-nav" aria-label="Main">
      <button type="button" className="chip is-selected" aria-current="page">
        Dashboard
      </button>
      {placeholderItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className="btn btn-ghost"
          disabled
        >
          {item.label} <span className="badge soon">Coming soon</span>
        </button>
      ))}
    </nav>
  );
}
