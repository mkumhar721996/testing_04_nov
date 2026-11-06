import { Hero } from './Hero';
import { TopBar } from './TopBar';
import { useCardSummary } from './useCardSummary';
import { useProfile } from './useProfile';
import './dashboard.css';

export function Dashboard() {
  const profile = useProfile();
  const card = useCardSummary();
  const name = profile.data?.name ?? '';

  return (
    <div className="page">
      <TopBar name={name} />
      <main>
        <Hero name={name} card={card} />
      </main>
    </div>
  );
}
