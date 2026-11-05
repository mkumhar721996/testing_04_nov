import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { DirectoryUser, UserDirectory } from './defect.repository';

@Injectable()
export class PgUserDirectory implements UserDirectory {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listDevelopers(): Promise<DirectoryUser[]> {
    const { rows } = await this.pool.query(
      "SELECT id, name FROM app_users WHERE role = 'Developer' ORDER BY name, id",
    );
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async findDeveloper(id: string): Promise<DirectoryUser | null> {
    const { rows } = await this.pool.query(
      "SELECT id, name FROM app_users WHERE role = 'Developer' AND id = $1",
      [id],
    );
    return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
  }
}
