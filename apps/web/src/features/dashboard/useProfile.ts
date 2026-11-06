import { fetchProfile } from './api';
import { useResource } from './useResource';

export const useProfile = () => useResource(fetchProfile);
