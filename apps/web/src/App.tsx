import { useState } from 'react';
import type { Role, Session } from './api/auth';
import { AppShell } from './components/AppShell';
import { SessionProvider, useSession } from './features/auth/SessionProvider';
import { SignInPage } from './features/auth/SignInPage';
import { navForRole } from './features/auth/nav';
import { DefectPage } from './features/defect/DefectPage';

// No router is installed: a defect opens at /items/:id, read from the path.
const defectIdFromPath = (path: string) => /^\/items\/([^/]+)\/?$/.exec(path)?.[1] ?? null;

const ALLOWED_ACTIONS: Record<Role, string[]> = {
  buyer: ['Search for parts', 'Keep one cart and place an order', "View the Distributor's orders"],
  admin: [
    'Search for parts',
    'Keep one cart and place an order',
    "View the Distributor's orders",
    'Abandon a failed child order',
  ],
  csr: ['Search for parts', "View the Distributor's orders"],
};

function Search({ session }: { session: Session }) {
  const article = session.role === 'admin' ? 'an' : 'a';
  return (
    <div className="stack">
      <h1>Search</h1>
      <p className="text-muted">
        Signed in as {session.name}, {session.title}.
      </p>
      <div className="field">
        <label htmlFor="part-search">Part number or description</label>
        <input id="part-search" type="search" />
      </div>
      <div>
        <button className="btn btn-primary" type="button">
          Search
        </button>
      </div>
      <div className="empty-state">
        <h2>Search for a part</h2>
        <p>Enter a part number or description to see matching parts.</p>
      </div>
      <section className="card stack">
        <h2>
          What you can do as {article} {session.title}
        </h2>
        <ul className="perm-list">
          {ALLOWED_ACTIONS[session.role].map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <h1>{title} is not available yet</h1>
    </div>
  );
}

function Shell({ session }: { session: Session }) {
  const { signOut } = useSession();
  const [section, setSection] = useState('search');
  const id = defectIdFromPath(window.location.pathname);

  let content;
  if (id) content = <DefectPage id={decodeURIComponent(id)} />;
  else if (section === 'cart') content = <Placeholder title="Cart" />;
  else if (section === 'orders') content = <Placeholder title="Orders" />;
  else content = <Search session={session} />;

  return (
    <AppShell
      navItems={navForRole(session.role)}
      currentKey={section}
      onNavigate={(key) => {
        if (id) window.history.pushState({}, '', '/');
        setSection(key);
      }}
      user={session}
      onSignOut={signOut}
    >
      {content}
    </AppShell>
  );
}

function Routes() {
  const { session } = useSession();
  return session ? <Shell session={session} /> : <SignInPage />;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes />
    </SessionProvider>
  );
}
