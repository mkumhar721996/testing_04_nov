import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { AuthUser } from './auth-user';
import type { CardSummaryDto, OverviewDto, ProfileDto, TransactionDto } from './dashboard.dto';

const DEFAULT_TRANSACTION_LIMIT = 5;

export function formatExpiry({ month, year }: { month: number; year: number }): string {
  return `${String(month).padStart(2, '0')}/${String(year % 100).padStart(2, '0')}`;
}

/** Minor units (cents) to a decimal amount string, assuming two minor digits. */
export function formatMinorUnits(minor: string): string {
  const value = BigInt(minor);
  const abs = value < 0n ? -value : value;
  const sign = value < 0n ? '-' : '';
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async profile(user: AuthUser): Promise<ProfileDto> {
    const { rows } = await this.pool.query<{ display_name: string }>(
      'SELECT display_name FROM accounts WHERE owner_subject = $1',
      [user.subject],
    );
    const name = rows[0]?.display_name ?? user.name;
    if (!name) throw new NotFoundException('No account for this user');
    return { name };
  }

  async cardSummary(user: AuthUser): Promise<CardSummaryDto> {
    let rows: {
      number_last4: string;
      expiry_month: number;
      expiry_year: number;
      balance_minor: string;
      currency: string;
    }[];
    try {
      // Only the last four digits are ever stored or selected.
      ({ rows } = await this.pool.query(
        `SELECT c.number_last4, c.expiry_month, c.expiry_year, a.balance_minor, a.currency
           FROM accounts a JOIN cards c ON c.account_id = a.id
          WHERE a.owner_subject = $1
          ORDER BY c.id
          LIMIT 1`,
        [user.subject],
      ));
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'UnknownError';
      this.logger.error(`card-summary failed userRef=${this.userRef(user)} reason=${reason}`);
      throw error;
    }
    const row = rows[0];
    if (!row) throw new NotFoundException('No card for this user');
    return {
      last4: row.number_last4,
      expiry: formatExpiry({ month: row.expiry_month, year: row.expiry_year }),
      balance: { amount: formatMinorUnits(row.balance_minor), currency: row.currency },
    };
  }

  async overview(user: AuthUser): Promise<OverviewDto> {
    const year = new Date().getUTCFullYear();
    let rows: {
      year: number | null;
      month: number | null;
      net_minor: string | null;
      currency: string;
    }[];
    try {
      // Accounts are left-joined so an account without transactions still yields its currency.
      ({ rows } = await this.pool.query(
        `SELECT t.year, t.month, t.net_minor, a.currency
           FROM accounts a
           LEFT JOIN (
                  SELECT account_id,
                         EXTRACT(YEAR FROM occurred_at AT TIME ZONE 'UTC')::int AS year,
                         EXTRACT(MONTH FROM occurred_at AT TIME ZONE 'UTC')::int AS month,
                         SUM(amount_minor)::text AS net_minor
                    FROM transactions
                   WHERE occurred_at >= make_timestamptz($2, 1, 1, 0, 0, 0, 'UTC')
                     AND occurred_at < make_timestamptz($3, 1, 1, 0, 0, 0, 'UTC')
                   GROUP BY account_id, year, month
                ) t ON t.account_id = a.id
          WHERE a.owner_subject = $1`,
        [user.subject, year - 1, year + 1],
      ));
    } catch (error) {
      this.logFailure('overview', user, error);
      throw error;
    }
    if (!rows[0]) throw new NotFoundException('No account for this user');

    const months = Array.from({ length: 12 }, () => 0n);
    let previous = 0n;
    let hasMovement = false;
    let hasPrevious = false;
    for (const row of rows) {
      if (row.year === null || row.month === null || row.net_minor === null) continue;
      if (row.year === year) {
        months[row.month - 1] += BigInt(row.net_minor);
        hasMovement = true;
      } else if (row.year === year - 1) {
        previous += BigInt(row.net_minor);
        hasPrevious = true;
      }
    }
    const total = months.reduce((sum, net) => sum + net, 0n);
    return {
      year,
      currency: rows[0].currency,
      total: formatMinorUnits(String(total)),
      trend: hasPrevious && previous !== 0n ? this.trend(total, previous, year - 1) : null,
      months: months.map((net, i) => ({ month: i + 1, net: formatMinorUnits(String(net)) })),
      hasMovement,
    };
  }

  async transactions(
    user: AuthUser,
    limit = DEFAULT_TRANSACTION_LIMIT,
  ): Promise<TransactionDto[]> {
    try {
      const { rows } = await this.pool.query<{
        id: string;
        merchant: string;
        occurred_at: Date;
        status: TransactionDto['status'];
        card_last4: string | null;
        amount_minor: string;
      }>(
        `SELECT t.id, t.merchant, t.occurred_at, t.status, t.card_last4, t.amount_minor
           FROM transactions t JOIN accounts a ON a.id = t.account_id
          WHERE a.owner_subject = $1
          ORDER BY t.occurred_at DESC, t.id DESC
          LIMIT $2`,
        [user.subject, limit],
      );
      return rows.map((row) => ({
        id: String(row.id),
        merchant: row.merchant,
        occurredAt: new Date(row.occurred_at).toISOString(),
        status: row.status,
        cardLast4: row.card_last4,
        amount: formatMinorUnits(row.amount_minor),
      }));
    } catch (error) {
      this.logFailure('transactions', user, error);
      throw error;
    }
  }

  /** Year-over-year change in hundredths of a percent, rounded half up, shown as "2.46". */
  private trend(total: bigint, previous: bigint, previousYear: number): NonNullable<OverviewDto['trend']> {
    const diff = total - previous;
    const base = previous < 0n ? -previous : previous;
    const abs = diff < 0n ? -diff : diff;
    const hundredths = (abs * 10000n * 2n + base) / (base * 2n);
    const direction = diff === 0n ? 'flat' : diff > 0n ? 'up' : 'down';
    return {
      direction,
      percent: `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}`,
      previousYear,
    };
  }

  private logFailure(section: string, user: AuthUser, error: unknown): void {
    const reason = error instanceof Error ? error.name : 'UnknownError';
    this.logger.error(`${section} failed userRef=${this.userRef(user)} reason=${reason}`);
  }

  private userRef(user: AuthUser): string {
    return createHash('sha256').update(user.subject).digest('hex').slice(0, 12);
  }
}
