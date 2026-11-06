import { Hero } from './Hero';
import { OverviewCard } from './OverviewCard';
import { RecentTransactions } from './RecentTransactions';
import { TopBar } from './TopBar';
import { useCardSummary } from './useCardSummary';
import { useOverview } from './useOverview';
import { useProfile } from './useProfile';
import { useToast } from './useToast';
import { useTransactions } from './useTransactions';
import './dashboard.css';

export function Dashboard() {
  const profile = useProfile();
  const card = useCardSummary();
  const overview = useOverview();
  const transactions = useTransactions();
  const { show, toast } = useToast();
  const name = profile.data?.name ?? '';
  const currency = card.data?.balance.currency ?? overview.data?.currency ?? 'USD';

  return (
    <div className="page">
      <TopBar name={name} />
      <main>
        <Hero name={name} card={card} />
        <div className="wrap">
          <div className="dash-grid">
            <div className="col">
              <OverviewCard overview={overview} onSoon={show} />
              <RecentTransactions transactions={transactions} currency={currency} onSoon={show} />
            </div>
          </div>
        </div>
      </main>
      {toast}
    </div>
  );
}
