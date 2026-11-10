import { useState } from 'react';
import type { Role, Session } from './api/auth';
import { AppShell } from './components/AppShell';
import { ComponentSettings } from './components-settings/ComponentSettings';
import { SessionProvider, useSession } from './features/auth/SessionProvider';
import { SignInPage } from './features/auth/SignInPage';
import { navForRole } from './features/auth/nav';
import { Dashboard } from './features/dashboard/Dashboard';
import { DefectPage } from './features/defect/DefectPage';
import { CartProvider } from './features/cart/CartProvider';
import { PartSearch } from './features/parts/PartSearch';

// No router is installed: a defect opens at /items/:id, read from the path.
const defectIdFromPath = (path: string) => /^\/items\/([^/]+)\/?$/.exec(path)?.[1] ?? null;

// Component management is reached at /settings/components (no nav entry: nav is role-driven).
const isComponentSettingsPath = (path: string) => /^\/settings\/components\/?$/.test(path);

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

function Search({ session, onViewCart }: { session: Session; onViewCart(): void }) {
  const article = session.role === 'admin' ? 'an' : 'a';
  return (
    <div className="stack">
      <h1 className="text-lg">Part search</h1>
      <p className="text-muted">
        Signed in as {session.name}, {session.title}.
      </p>
      <PartSearch role={session.role} onViewCart={onViewCart} />
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

  // TODO(rebase): uncertain merge — please review. Main rendered the Dashboard at '/';
  // with sign-in gating it is now shown to signed-in users at '/dashboard'.
  if (window.location.pathname === '/dashboard') return <Dashboard />;

  let content;
  if (isComponentSettingsPath(window.location.pathname)) content = <ComponentSettings />;
  else if (id) content = <DefectPage id={decodeURIComponent(id)} />;
  else if (section === 'cart') content = <Placeholder title="Cart" />;
  else if (section === 'orders') content = <Placeholder title="Orders" />;
  else content = <Search session={session} onViewCart={() => setSection('cart')} />;

  return (
    <CartProvider>
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
    </CartProvider>
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
