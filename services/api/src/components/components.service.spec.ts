import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentsService } from './components.service';
import { InMemoryComponentsRepository } from './in-memory-components.repository.fake';

let repo: InMemoryComponentsRepository;
let service: ComponentsService;

beforeEach(() => {
  repo = new InMemoryComponentsRepository();
  service = new ComponentsService(repo);
});

describe('add', () => {
  it('trims the name and offers it to reporters (AC3)', async () => {
    const created = await service.add('  Billing ');
    expect(created).toMatchObject({ name: 'Billing', status: 'active' });
    expect((await service.list('active')).map((c) => c.name)).toContain('Billing');
  });

  it('rejects an empty or over-long name with 400', async () => {
    await expect(service.add('   ')).rejects.toMatchObject({ status: 400 });
    await expect(service.add('x'.repeat(81))).rejects.toMatchObject({ status: 400 });
    await expect(service.add(undefined)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects a duplicate name case-insensitively with 409', async () => {
    await service.add('Billing');
    await expect(service.add('billing')).rejects.toMatchObject({ status: 409 });
  });
});

describe('rename', () => {
  it('lists the new name and not the old one for new defects (AC4)', async () => {
    const c = await service.add('Billing');
    await service.rename(c.id, 'Payments');
    const names = (await service.list('active')).map((x) => x.name);
    expect(names).toContain('Payments');
    expect(names).not.toContain('Billing');
  });

  it('refuses a name already in use and keeps the old name (AC7)', async () => {
    const billing = await service.add('Billing');
    await service.add('Payments');
    await expect(service.rename(billing.id, 'Payments')).rejects.toMatchObject({
      status: 409,
      message: 'A component named "Payments" already exists. The name was not changed. Choose a different name.',
    });
    await expect(service.rename(billing.id, 'payments')).rejects.toMatchObject({ status: 409 });
    expect((await repo.findById(billing.id))?.name).toBe('Billing');
  });

  it('keeps the id so defects show the new name (AC9)', async () => {
    const before = await service.add('Billing');
    const after = await service.rename(before.id, 'Payments');
    expect(after.id).toBe(before.id);
    expect(await repo.findById(before.id)).toMatchObject({ id: before.id, name: 'Payments' });
  });

  it('is a no-op for the identical name, 409 for a retired one, 404 for an unknown id', async () => {
    const a = await service.add('Billing');
    const legacy = await service.add('Legacy');
    expect(await service.rename(a.id, 'Billing')).toEqual(a);
    await service.retire(legacy.id);
    await expect(service.rename(legacy.id, 'Old')).rejects.toMatchObject({ status: 409 });
    await expect(service.rename('missing', 'X')).rejects.toMatchObject({ status: 404 });
  });
});

describe('retire', () => {
  it('keeps the row so existing defects still resolve it (AC5)', async () => {
    const legacy = await service.add('Legacy');
    await service.add('Billing');
    await service.retire(legacy.id);
    expect(await repo.findById(legacy.id)).toEqual({
      id: legacy.id,
      name: 'Legacy',
      status: 'retired',
    });
    expect((await service.list()).map((c) => c.name)).toContain('Legacy');
  });

  it('removes the component from the reporter list (AC6)', async () => {
    const legacy = await service.add('Legacy');
    await service.add('Billing');
    await service.retire(legacy.id);
    expect((await service.list('active')).map((c) => c.name)).not.toContain('Legacy');
  });

  it('refuses to retire the only active component (AC8)', async () => {
    const billing = await service.add('Billing');
    await expect(service.retire(billing.id)).rejects.toMatchObject({
      status: 409,
      message: 'Billing can\'t be retired because it is the only active component. Add another component first.',
    });
    expect((await repo.findById(billing.id))?.status).toBe('active');
  });

  it('is a no-op for an already retired component and 404 for an unknown id', async () => {
    const legacy = await service.add('Legacy');
    await service.add('Billing');
    await service.retire(legacy.id);
    expect(await service.retire(legacy.id)).toMatchObject({ status: 'retired' });
    await expect(service.retire('missing')).rejects.toMatchObject({ status: 404 });
  });
});
