import { getAccessToken } from '../auth/token';

export type ComponentStatus = 'active' | 'retired';

export interface ComponentItem {
  id: string;
  name: string;
  status: ComponentStatus;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.message ?? response.statusText);
  }
  return response.json();
}

export function listComponents(status?: ComponentStatus): Promise<ComponentItem[]> {
  return request(status ? `/components?status=${status}` : '/components');
}

export function addComponent(name: string): Promise<ComponentItem> {
  return request('/components', { method: 'POST', body: JSON.stringify({ name }) });
}

export function renameComponent(id: string, name: string): Promise<ComponentItem> {
  return request(`/components/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function retireComponent(id: string): Promise<ComponentItem> {
  return request(`/components/${id}/retire`, { method: 'POST' });
}

export function getMe(): Promise<{ isLead: boolean }> {
  return request('/me');
}
