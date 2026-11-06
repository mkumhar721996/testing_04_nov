import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export type ComponentStatus = 'active' | 'retired';

export interface ComponentRecord {
  id: string;
  name: string;
  status: ComponentStatus;
}

export class NameTakenError extends Error {
  constructor() {
    super('component name already taken');
  }
}

export interface ComponentsRepository {
  list(status?: ComponentStatus): Promise<ComponentRecord[]>;
  // Includes retired components: defect views resolve through this.
  findById(id: string): Promise<ComponentRecord | null>;
  // Throws NameTakenError on a unique violation.
  insert(name: string): Promise<ComponentRecord>;
  // Throws NameTakenError on a unique violation.
  rename(id: string, name: string): Promise<ComponentRecord>;
  // One transaction that locks the active rows, so two concurrent retires
  // cannot leave zero active components.
  retireIfNotLastActive(id: string): Promise<ComponentRecord | 'last-active'>;
}

export const COMPONENTS_REPOSITORY = 'COMPONENTS_REPOSITORY';

const COLUMNS = 'id, name, status';
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string }).code === UNIQUE_VIOLATION;
}

@Injectable()
export class PgComponentsRepository implements ComponentsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(status?: ComponentStatus): Promise<ComponentRecord[]> {
    const result = status
      ? await this.pool.query<ComponentRecord>(
          `SELECT ${COLUMNS} FROM components WHERE status = $1 ORDER BY lower(name)`,
          [status],
        )
      : await this.pool.query<ComponentRecord>(
          `SELECT ${COLUMNS} FROM components ORDER BY lower(name)`,
        );
    return result.rows;
  }

  async findById(id: string): Promise<ComponentRecord | null> {
    const result = await this.pool.query<ComponentRecord>(
      `SELECT ${COLUMNS} FROM components WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async insert(name: string): Promise<ComponentRecord> {
    try {
      const result = await this.pool.query<ComponentRecord>(
        `INSERT INTO components (name) VALUES ($1) RETURNING ${COLUMNS}`,
        [name],
      );
      return result.rows[0];
    } catch (error) {
      if (isUniqueViolation(error)) throw new NameTakenError();
      throw error;
    }
  }

  async rename(id: string, name: string): Promise<ComponentRecord> {
    try {
      const result = await this.pool.query<ComponentRecord>(
        `UPDATE components SET name = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
        [id, name],
      );
      return result.rows[0];
    } catch (error) {
      if (isUniqueViolation(error)) throw new NameTakenError();
      throw error;
    }
  }

  async retireIfNotLastActive(id: string): Promise<ComponentRecord | 'last-active'> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const active = await client.query<{ id: string }>(
        `SELECT id FROM components WHERE status = 'active' FOR UPDATE`,
      );
      const isActive = active.rows.some((row) => row.id === id);
      if (isActive && active.rows.length <= 1) {
        await client.query('ROLLBACK');
        return 'last-active';
      }
      const result = await client.query<ComponentRecord>(
        `UPDATE components SET status = 'retired' WHERE id = $1 RETURNING ${COLUMNS}`,
        [id],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
