import { ComponentSettings } from './components-settings/ComponentSettings';
import { AppShell } from './shell/AppShell';

export default function App() {
  return (
    <AppShell>
      <ComponentSettings />
    </AppShell>
  );
}
