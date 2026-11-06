import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { AuthUser } from './auth-user';
import type { CardSummaryDto, ProfileDto } from './dashboard.dto';

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

  private userRef(user: AuthUser): string {
    return createHash('sha256').update(user.subject).digest('hex').slice(0, 12);
  }
}
