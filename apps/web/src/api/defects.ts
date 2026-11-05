export type Status =
  | 'New'
  | 'Triaged'
  | 'In progress'
  | 'Resolved'
  | 'Verified'
  | 'Closed'
  | 'Rejected';

export interface StatusMove {
  to: Status;
  label: string;
  requiresReason: boolean;
}

export interface DefectComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DefectDetail {
  id: string;
  key: string;
  title: string;
  status: Status;
  rowVersion: number;
  ownerId: string | null;
  ownerName: string | null;
  comments: DefectComment[];
  availableMoves: StatusMove[];
  canSetOwner: boolean;
}

export interface Developer {
  id: string;
  name: string;
}

export type MoveResult =
  | { kind: 'ok'; defect: DefectDetail }
  | { kind: 'conflict'; defect: DefectDetail }
  | { kind: 'forbidden' }
  | { kind: 'invalid'; message: string }
  | { kind: 'error' };

const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/';
const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;

export async function getDefect(id: string): Promise<DefectDetail> {
  const res = await fetch(url(`/defects/${encodeURIComponent(id)}`));
  if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : 'failed');
  return res.json();
}

export async function getDevelopers(): Promise<Developer[]> {
  const res = await fetch(url('/developers'));
  if (!res.ok) throw new Error('failed');
  return res.json();
}

async function send(path: string, method: string, body: unknown): Promise<MoveResult> {
  try {
    const res = await fetch(url(path), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { kind: 'ok', defect: await res.json() };
    if (res.status === 409) return { kind: 'conflict', defect: (await res.json()).defect };
    if (res.status === 403) return { kind: 'forbidden' };
    if (res.status === 400) return { kind: 'invalid', message: (await res.json()).message };
    return { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

export function postMove(
  id: string,
  body: { to: Status; expectedVersion: number; reason?: string },
): Promise<MoveResult> {
  return send(`/defects/${encodeURIComponent(id)}/status-moves`, 'POST', body);
}

export function putOwner(
  id: string,
  body: { ownerId: string | null; expectedVersion: number },
): Promise<MoveResult> {
  return send(`/defects/${encodeURIComponent(id)}/owner`, 'PUT', body);
}
