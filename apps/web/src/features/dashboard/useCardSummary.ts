import { fetchCardSummary } from './api';
import { useResource } from './useResource';

export const useCardSummary = () => useResource(fetchCardSummary);
