import { describe, expect, it, vi } from 'vitest';
import { DashboardController } from './dashboard.controller';
import type { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  const user = { subject: 'user-1' };
  const summary = { last4: '9286', expiry: '08/32', balance: { amount: '1.00', currency: 'USD' } };
  const service = {
    profile: vi.fn().mockResolvedValue({ name: 'Ada' }),
    cardSummary: vi.fn().mockResolvedValue(summary),
  } as unknown as DashboardService;
  const controller = new DashboardController(service);

  it('serves the profile and the card summary separately', async () => {
    expect(await controller.profile(user)).toEqual({ name: 'Ada' });
    expect(await controller.cardSummary(user)).toEqual(summary);
    expect(service.profile).toHaveBeenCalledWith(user);
    expect(service.cardSummary).toHaveBeenCalledWith(user);
  });
});
