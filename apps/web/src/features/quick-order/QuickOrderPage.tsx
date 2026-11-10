import { QuickOrderGrid } from './QuickOrderGrid';

export function QuickOrderPage() {
  return (
    <div className="stack quick-order-page">
      <div className="page-head">
        <h1 className="text-lg">Quick order</h1>
      </div>
      <QuickOrderGrid />
    </div>
  );
}
