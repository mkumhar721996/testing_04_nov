import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  CommentRecord,
  DefectRecord,
  DefectRepository,
  NewComment,
} from './defect.repository';
import { Status } from './workflow';

@Injectable()
export class PgDefectRepository implements DefectRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findById(id: string): Promise<DefectRecord | null> {
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query(
      'SELECT id, key, title, status, owner_id, owner_name, row_version FROM defects WHERE id = $1',
      [id],
    );
    const r = rows[0];
    return r
      ? {
          id: r.id,
          key: r.key,
          title: r.title,
          status: r.status,
          ownerId: r.owner_id,
          ownerName: r.owner_name,
          rowVersion: r.row_version,
        }
      : null;
  }

  async listComments(defectId: string): Promise<CommentRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT id, author_id, author_name, body, created_at FROM defect_comments WHERE defect_id = $1 ORDER BY created_at, id',
      [defectId],
    );
    return rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      authorName: r.author_name,
      body: r.body,
      createdAt: r.created_at,
    }));
  }

  async moveStatus(
    id: string,
    expectedVersion: number,
    to: Status,
    comment?: NewComment,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        'UPDATE defects SET status = $3, row_version = row_version + 1, updated_at = now() WHERE id = $1 AND row_version = $2',
        [id, expectedVersion, to],
      );
      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      if (comment) {
        await client.query(
          'INSERT INTO defect_comments (defect_id, author_id, author_name, body) VALUES ($1, $2, $3, $4)',
          [id, comment.authorId, comment.authorName, comment.body],
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
