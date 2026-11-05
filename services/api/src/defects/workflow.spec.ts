import { describe, expect, it } from 'vitest';
import { availableMoves, Actor, Role, Status } from './workflow';

const lead: Actor = { id: 'l1', role: 'Lead' };
const tester: Actor = { id: 't1', role: 'Tester' };
const owner: Actor = { id: 'd1', role: 'Developer' };
const other: Actor = { id: 'x9', role: 'Developer' };
const tos = (status: Status, actor: Actor, ownerId: string | null = 'd1') =>
  availableMoves({ status, ownerId }, actor).map((m) => m.to);

describe('availableMoves', () => {
  it('offers only the moves defined for the status (AC1)', () => {
    expect(tos('Triaged', lead, null)).toEqual(['Rejected']);
    expect(tos('New', lead, null)).toEqual([]);
    expect(tos('Verified', lead)).toEqual(['Closed']);
    expect(tos('Closed', lead)).toEqual(['Triaged']);
    expect(tos('Resolved', lead)).toEqual(['In progress']);
    expect(tos('In progress', lead)).toEqual(['Resolved']);
  });

  it('offers nothing on Rejected to any role (AC4)', () => {
    for (const role of ['Developer', 'Tester', 'Lead'] as Role[])
      expect(tos('Rejected', { id: 'd1', role })).toEqual([]);
  });

  it('offers reopen only to a Lead (AC9)', () => {
    expect(tos('Closed', tester)).toEqual([]);
    expect(tos('Closed', owner)).toEqual([]);
  });

  it('offers Resolved only to the owner or a Lead (AC11, AC12)', () => {
    expect(tos('In progress', owner)).toContain('Resolved');
    expect(tos('In progress', other)).not.toContain('Resolved');
    expect(tos('In progress', tester)).not.toContain('Resolved');
  });

  it('offers Verified only to a Tester (AC14, AC20)', () => {
    expect(tos('Resolved', tester)).toContain('Verified');
    expect(tos('Resolved', owner)).not.toContain('Verified');
    expect(tos('Resolved', lead)).not.toContain('Verified');
  });

  it('offers Closed only to a Lead (AC16)', () => {
    expect(tos('Verified', tester)).not.toContain('Closed');
  });

  it('offers Rejected only to a Lead (AC18)', () => {
    expect(tos('Triaged', owner, null)).not.toContain('Rejected');
  });

  it('offers In progress on Resolved only to a Tester or Lead (AC19)', () => {
    expect(tos('Resolved', owner)).not.toContain('In progress');
    expect(tos('Resolved', tester)).toContain('In progress');
  });

  it('marks reject and reopen as needing a reason', () => {
    const [reject] = availableMoves({ status: 'Triaged', ownerId: null }, lead);
    const [reopen] = availableMoves({ status: 'Closed', ownerId: null }, lead);
    expect(reject).toMatchObject({ label: 'Reject', requiresReason: true });
    expect(reopen).toMatchObject({ label: 'Reopen', requiresReason: true });
  });
});
