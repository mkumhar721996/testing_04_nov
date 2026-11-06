import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InMemoryDefectRepository } from './in-memory-defect.repository';
import { ActorIdentity, StatusMoveService } from './status-move.service';
import { Status } from './workflow';

const lead: ActorIdentity = { id: 'l1', name: 'Lead A.', role: 'Lead' };
const tester: ActorIdentity = { id: 't1', name: 'Tess Tester', role: 'Tester' };
const owner: ActorIdentity = { id: 'd1', name: 'Dev Rao', role: 'Developer' };

function setup(status: Status, ownerId: string | null = 'd1') {
  const repo = new InMemoryDefectRepository();
  const svc = new StatusMoveService(repo);
  const { id } = repo.seed({ status, ownerId, ownerName: ownerId ? 'Dev Rao' : null });
  return { repo, svc, id };
}

describe('StatusMoveService', () => {
  it('404s for an unknown defect', async () => {
    const { svc } = setup('Triaged');
    await expect(
      svc.move('missing', lead, { to: 'Rejected', expectedVersion: 1, reason: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['', '   ', undefined])('refuses rejection with reason %j (AC2, AC21)', async (reason) => {
    const { repo, svc, id } = setup('Triaged', null);
    await expect(
      svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.findById(id))!.status).toBe('Triaged');
    expect(await repo.listComments(id)).toHaveLength(0);
  });

  it('rejects with a reason and saves it as a comment (AC3, AC5)', async () => {
    const { repo, svc, id } = setup('Triaged', null);
    const out = await svc.move(id, lead, {
      to: 'Rejected',
      expectedVersion: 1,
      reason: '  Duplicate of DEF-12  ',
    });
    expect(out.status).toBe('Rejected');
    expect((await repo.listComments(id)).map((c) => c.body)).toEqual([
      'Rejected: Duplicate of DEF-12',
    ]);
    expect(out.comments[0]).toMatchObject({ authorName: 'Lead A.' });
  });

  it('refuses a reason over 2000 characters', async () => {
    const { svc, id } = setup('Triaged', null);
    await expect(
      svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason: 'a'.repeat(2001) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['', '  '])('refuses reopen with reason %j (AC6, AC22)', async (reason) => {
    const { repo, svc, id } = setup('Closed');
    await expect(
      svc.move(id, lead, { to: 'Triaged', expectedVersion: 1, reason }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.findById(id))!.status).toBe('Closed');
  });

  it('reopens to Triaged with the reason as a comment (AC7, AC8)', async () => {
    const { svc, id } = setup('Closed');
    const out = await svc.move(id, lead, {
      to: 'Triaged',
      expectedVersion: 1,
      reason: 'Regression in 2.3',
    });
    expect(out.status).toBe('Triaged');
    expect(out.comments.some((c) => c.body.includes('Regression in 2.3'))).toBe(true);
    expect(out.comments[0].body).toBe('Reopened: Regression in 2.3');
  });

  it('records a failed fix (AC10)', async () => {
    const { svc, id } = setup('Resolved');
    const out = await svc.move(id, tester, { to: 'In progress', expectedVersion: 1 });
    expect(out.status).toBe('In progress');
  });

  it('lets the owner mark Resolved (AC11)', async () => {
    const { svc, id } = setup('In progress');
    const out = await svc.move(id, owner, { to: 'Resolved', expectedVersion: 1 });
    expect(out.status).toBe('Resolved');
  });

  it('forbids Resolved for a non-owner non-Lead (AC12)', async () => {
    const { repo, svc, id } = setup('In progress');
    await expect(
      svc.move(id, { id: 'x9', name: 'X', role: 'Developer' }, { to: 'Resolved', expectedVersion: 1 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((await repo.findById(id))!.status).toBe('In progress');
  });

  it('lets a Tester verify (AC13)', async () => {
    const { svc, id } = setup('Resolved');
    const out = await svc.move(id, tester, { to: 'Verified', expectedVersion: 1 });
    expect(out.status).toBe('Verified');
  });

  it('forbids a non-Tester verifying and changes nothing', async () => {
    const { repo, svc, id } = setup('Resolved');
    await expect(
      svc.move(id, lead, { to: 'Verified', expectedVersion: 1 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((await repo.findById(id))!.rowVersion).toBe(1);
  });

  it('lets a Lead close a Verified defect (AC15)', async () => {
    const { svc, id } = setup('Verified');
    const out = await svc.move(id, lead, { to: 'Closed', expectedVersion: 1 });
    expect(out.status).toBe('Closed');
  });

  it('refuses a stale move and reports the current status (AC23, AC24)', async () => {
    const { repo, svc, id } = setup('Resolved');
    await svc.move(id, tester, { to: 'Verified', expectedVersion: 1 });
    const err = await svc
      .move(id, lead, { to: 'In progress', expectedVersion: 1 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({
      currentStatus: 'Verified',
      defect: { status: 'Verified', rowVersion: 2 },
    });
    expect((await repo.findById(id))!.rowVersion).toBe(2);
  });

  it('checks the version before permission and reason', async () => {
    const { svc, id } = setup('Triaged', null);
    await svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason: 'dup' });
    await expect(
      svc.move(id, owner, { to: 'Rejected', expectedVersion: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('answers 409 when the write loses a race', async () => {
    const { repo, svc, id } = setup('Resolved');
    vi.spyOn(repo, 'moveStatus').mockResolvedValueOnce(false);
    await expect(
      svc.move(id, tester, { to: 'Verified', expectedVersion: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
