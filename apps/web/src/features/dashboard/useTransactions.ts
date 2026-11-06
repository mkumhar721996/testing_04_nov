import { fetchTransactions } from './api';
import { useResource } from './useResource';

export const useTransactions = () => useResource(fetchTransactions);
