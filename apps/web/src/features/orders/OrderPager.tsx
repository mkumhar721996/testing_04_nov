import { forwardRef } from 'react';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export const OrderPager = forwardRef<HTMLElement, Props>(function OrderPager(
  { page, pageSize, total, onPage },
  ref,
) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav className="pager" aria-label="Order pages" ref={ref}>
      <span role="status">
        Showing {first}–{last} of {total} orders, page {page} of {pages}
      </span>
      <span className="cluster">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous page
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next page
        </button>
      </span>
    </nav>
  );
});
