import { fetchOverview } from './api';
import { useResource } from './useResource';

export const useOverview = () => useResource(fetchOverview);
