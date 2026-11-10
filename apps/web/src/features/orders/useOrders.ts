import { useCallback, useEffect, useState } from 'react';
import { getOrders, type OrderPage } from '../../api/orders';
import type { Loadable } from '../dashboard/types';

export function useOrders(page: number): Loadable<OrderPage> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: Loadable<OrderPage>['status']; data: OrderPage | null }>({
    status: 'loading',
    data: null,
  });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', data: null });
    getOrders(page).then(
      (data) => current && setState({ status: 'ready', data }),
      () => current && setState({ status: 'error', data: null }),
    );
    return () => {
      current = false;
    };
  }, [page, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
