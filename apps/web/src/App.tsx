import { AppShell } from './components/AppShell';
import { Dashboard } from './features/dashboard/Dashboard';
import { DefectPage } from './features/defect/DefectPage';

// No router is installed: a defect opens at /items/:id, read from the path.
const defectIdFromPath = (path: string) => /^\/items\/([^/]+)\/?$/.exec(path)?.[1] ?? null;

export default function App() {
  const path = window.location.pathname;
  if (path === '/') return <Dashboard />;
  const id = defectIdFromPath(path);
  return (
    <AppShell>
      {id ? (
        <DefectPage id={decodeURIComponent(id)} />
      ) : (
        <p className="text-muted">Open a defect from Items to see its status.</p>
      )}
    </AppShell>
  );
}
