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

describe('DashboardService.overview', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  const at2026 = () => vi.useFakeTimers({ now: new Date('2026-11-06T10:00:00Z') });
  const row = (year: number | null, month: number | null, net: string | null) => ({
    year,
    month,
    net_minor: net,
    currency: 'USD',
  });

  it('totals the year, shows the trend on last year and always returns 12 months (AC1-3)', async () => {
    at2026();
    const query = vi.fn().mockResolvedValue({
      rows: [row(2026, 3, '100000'), row(2026, 11, '84256'), row(2025, 5, '179832')],
    });
    const dto = await new DashboardService(poolWith(query)).overview(user);
    expect(dto.total).toBe('1842.56');
    expect(dto.year).toBe(2026);
    expect(dto.currency).toBe('USD');
    expect(dto.trend).toEqual({ direction: 'up', percent: '2.46', previousYear: 2025 });
    expect(dto.months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(dto.months[2].net).toBe('1000.00');
    expect(dto.months[0].net).toBe('0.00');
    expect(dto.hasMovement).toBe(true);
    expect(query.mock.calls[0][0]).not.toMatch(/\*/);
  });

  it('has no trend when the previous year has no movement (AC2)', async () => {
    at2026();
    const query = vi.fn().mockResolvedValue({ rows: [row(2026, 3, '100000')] });
    expect((await new DashboardService(poolWith(query)).overview(user)).trend).toBeNull();
  });

  it('reports a decrease', async () => {
    at2026();
    const query = vi.fn().mockResolvedValue({ rows: [row(2026, 1, '5000'), row(2025, 1, '10000')] });
    expect((await new DashboardService(poolWith(query)).overview(user)).trend).toEqual({
      direction: 'down',
      percent: '50.00',
      previousYear: 2025,
    });
  });

  it('has no movement for an account without transactions (AC6)', async () => {
    at2026();
    const query = vi.fn().mockResolvedValue({ rows: [row(null, null, null)] });
    const dto = await new DashboardService(poolWith(query)).overview(user);
    expect(dto.hasMovement).toBe(false);
    expect(dto.total).toBe('0.00');
    expect(dto.months).toHaveLength(12);
  });

  it('logs a failed query without amounts or subject and rethrows (AC7)', async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const query = vi.fn().mockRejectedValue(new Error('down'));
    await expect(new DashboardService(poolWith(query)).overview(user)).rejects.toThrow();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('overview failed userRef='));
    expect(loggerSpy.mock.calls.join('')).not.toContain(user.subject);
  });
});

describe('DashboardService.transactions', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the latest transactions newest first with limit (AC4)', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: '9',
          merchant: 'Adobe Creative Cloud',
          occurred_at: new Date('2026-11-06T09:42:00Z'),
          status: 'in_progress',
          card_last4: '2841',
          amount_minor: '-5999',
        },
        {
          id: '8',
          merchant: 'Northwind Logistics salary',
          occurred_at: new Date('2026-11-05T08:00:00Z'),
          status: 'completed',
          card_last4: null,
          amount_minor: '245000',
        },
      ],
    });
    const list = await new DashboardService(poolWith(query)).transactions(user);
    expect(list.map((t) => t.merchant)).toEqual([
      'Adobe Creative Cloud',
      'Northwind Logistics salary',
    ]);
    expect(list[0]).toEqual({
      id: '9',
      merchant: 'Adobe Creative Cloud',
      occurredAt: '2026-11-06T09:42:00.000Z',
      status: 'in_progress',
      cardLast4: '2841',
      amount: '-59.99',
    });
    expect(query.mock.calls[0][0]).toMatch(/LIMIT/);
    expect(query.mock.calls[0][0]).not.toMatch(/\*/);
    expect(query.mock.calls[0][1]).toEqual([user.subject, 5]);
  });

  it('is an empty list, not 404, without transactions (AC5)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    expect(await new DashboardService(poolWith(query)).transactions(user)).toEqual([]);
  });

  it('logs a failed query and rethrows (AC8)', async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const query = vi.fn().mockRejectedValue(new Error('down'));
    await expect(new DashboardService(poolWith(query)).transactions(user)).rejects.toThrow();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('transactions failed'));
  });
});
