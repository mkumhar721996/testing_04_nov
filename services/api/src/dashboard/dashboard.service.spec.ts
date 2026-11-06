import { Logger, NotFoundException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardService, formatExpiry, formatMinorUnits } from './dashboard.service';

const user = { subject: 'user-1', name: 'Token Name' };
const poolWith = (query: ReturnType<typeof vi.fn>) => ({ query }) as never;

describe('formatExpiry', () => {
  it('formats MM/YY with a zero-padded month', () => {
    expect(formatExpiry({ month: 8, year: 2032 })).toBe('08/32');
    expect(formatExpiry({ month: 11, year: 2030 })).toBe('11/30');
  });
});

describe('formatMinorUnits', () => {
  it('converts bigint minor units to a decimal amount', () => {
    expect(formatMinorUnits('1268042')).toBe('12680.42');
    expect(formatMinorUnits('5')).toBe('0.05');
    expect(formatMinorUnits('-250')).toBe('-2.50');
  });
});

describe('DashboardService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the display name of the account', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ display_name: 'Ada' }] });
    expect(await new DashboardService(poolWith(query)).profile(user)).toEqual({ name: 'Ada' });
  });

  it('returns only last4, MM/YY expiry and the balance', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          number_last4: '9286',
          expiry_month: 8,
          expiry_year: 2032,
          balance_minor: '1268042',
          currency: 'USD',
        },
      ],
    });
    const summary = await new DashboardService(poolWith(query)).cardSummary(user);
    expect(summary).toEqual({
      last4: '9286',
      expiry: '08/32',
      balance: { amount: '12680.42', currency: 'USD' },
    });
    expect(JSON.stringify(summary)).not.toMatch(/\d{13,}/);
    expect(query.mock.calls[0][0]).not.toMatch(/\*/);
  });

  it('is 404 when the user has no card', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await expect(new DashboardService(poolWith(query)).cardSummary(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('logs a failed query without card data and rethrows', async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const query = vi.fn().mockRejectedValue(new Error('connection refused 9286'));
    await expect(new DashboardService(poolWith(query)).cardSummary(user)).rejects.toThrow();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('card-summary failed'));
    expect(loggerSpy.mock.calls.join('')).not.toContain('9286');
    expect(loggerSpy.mock.calls.join('')).not.toContain(user.subject);
  });
});
