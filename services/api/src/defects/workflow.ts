export const STATUSES = [
  'New',
  'Triaged',
  'In progress',
  'Resolved',
  'Verified',
  'Closed',
  'Rejected',
] as const;
export type Status = (typeof STATUSES)[number];
export type Role = 'Developer' | 'Tester' | 'Lead';
export interface Actor {
  id: string;
  role: Role;
}
export interface StatusMove {
  to: Status;
  label: string;
  requiresReason: boolean;
}

interface Rule extends StatusMove {
  from: Status;
  allowed: (defect: { ownerId: string | null }, actor: Actor) => boolean;
}

const isLead = (_d: unknown, a: Actor) => a.role === 'Lead';
const isTester = (_d: unknown, a: Actor) => a.role === 'Tester';

const RULES: Rule[] = [
  { from: 'New', to: 'Triaged', label: 'Triage', requiresReason: false, allowed: isLead },
  {
    from: 'Triaged',
    to: 'In progress',
    label: 'Move to In progress',
    requiresReason: false,
    allowed: (d, a) => a.role === 'Lead' || (d.ownerId !== null && d.ownerId === a.id),
  },
  { from: 'Triaged', to: 'Rejected', label: 'Reject', requiresReason: true, allowed: isLead },
  {
    from: 'In progress',
    to: 'Resolved',
    label: 'Mark Resolved',
    requiresReason: false,
    allowed: (d, a) => a.role === 'Lead' || (d.ownerId !== null && d.ownerId === a.id),
  },
  { from: 'Resolved', to: 'Verified', label: 'Verify', requiresReason: false, allowed: isTester },
  {
    from: 'Resolved',
    to: 'In progress',
    label: 'Record failed fix',
    requiresReason: false,
    allowed: (d, a) => isTester(d, a) || isLead(d, a),
  },
  { from: 'Verified', to: 'Closed', label: 'Close', requiresReason: false, allowed: isLead },
  { from: 'Closed', to: 'Triaged', label: 'Reopen', requiresReason: true, allowed: isLead },
];

/** Every move into In progress needs an owner, so someone is accountable for the work. */
export const requiresOwner = (_from: Status, to: Status) => to === 'In progress';

export function availableMoves(
  defect: { status: Status; ownerId: string | null },
  actor: Actor,
): StatusMove[] {
  return RULES.filter((r) => r.from === defect.status && r.allowed(defect, actor)).map(
    ({ to, label, requiresReason }) => ({ to, label, requiresReason }),
  );
}
