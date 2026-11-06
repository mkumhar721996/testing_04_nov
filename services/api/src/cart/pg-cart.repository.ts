import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CartLineRecord, CartRepository } from './cart.repository';

const COLUMNS = 'id, part_number, description, sap_instance, stock_shown, quantity';

function toRecord(r: Record<string, any>): CartLineRecord {
  return {
    id: r.id,
    partNumber: r.part_number,
    description: r.description,
    sapInstance: r.sap_instance,
    stockShown: r.stock_shown,
    quantity: r.quantity,
  };
}

@Injectable()
export class PgCartRepository implements CartRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listByOwner(ownerId: string): Promise<CartLineRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM cart_lines WHERE owner_id = $1 ORDER BY created_at, id`,
      [ownerId],
    );
    return rows.map(toRecord);
  }

  async findOwned(ownerId: string, lineId: string): Promise<CartLineRecord | null> {
    if (!UUID.test(lineId)) return null;
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNS} FROM cart_lines WHERE owner_id = $1 AND id = $2`,
      [ownerId, lineId],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async setQuantity(
    ownerId: string,
    lineId: string,
    quantity: number,
  ): Promise<CartLineRecord | null> {
    if (!UUID.test(lineId)) return null;
    const { rows } = await this.pool.query(
      `UPDATE cart_lines SET quantity = $3 WHERE owner_id = $1 AND id = $2 RETURNING ${COLUMNS}`,
      [ownerId, lineId, quantity],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async remove(ownerId: string, lineId: string): Promise<boolean> {
    if (!UUID.test(lineId)) return false;
    const res = await this.pool.query('DELETE FROM cart_lines WHERE owner_id = $1 AND id = $2', [
      ownerId,
      lineId,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  async add(ownerId: string, line: Omit<CartLineRecord, 'id'>): Promise<CartLineRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO cart_lines (owner_id, part_number, description, sap_instance, stock_shown, quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
      [ownerId, line.partNumber, line.description, line.sapInstance, line.stockShown, line.quantity],
    );
    return toRecord(rows[0]);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
