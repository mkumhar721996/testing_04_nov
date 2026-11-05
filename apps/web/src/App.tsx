import { AppShell } from './components/AppShell';
import { DefectPage } from './features/defect/DefectPage';

// No router is installed: a defect opens at /items/:id, read from the path.
const defectIdFromPath = (path: string) => /^\/items\/([^/]+)\/?$/.exec(path)?.[1] ?? null;

export default function App() {
  const id = defectIdFromPath(window.location.pathname);
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
