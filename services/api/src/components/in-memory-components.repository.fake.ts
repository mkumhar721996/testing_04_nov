import { randomUUID } from 'node:crypto';
import {
  ComponentRecord,
  ComponentStatus,
  ComponentsRepository,
  NameTakenError,
} from './components.repository';

// Test double that mirrors the SQL repository's rules (case-insensitive unique name).
export class InMemoryComponentsRepository implements ComponentsRepository {
  private rows: ComponentRecord[] = [];

  private taken(name: string, exceptId?: string): boolean {
    return this.rows.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
  }

  async list(status?: ComponentStatus): Promise<ComponentRecord[]> {
    return this.rows
      .filter((r) => !status || r.status === status)
      .map((r) => ({ ...r }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  async findById(id: string): Promise<ComponentRecord | null> {
    const row = this.rows.find((r) => r.id === id);
    return row ? { ...row } : null;
  }

  async insert(name: string): Promise<ComponentRecord> {
    if (this.taken(name)) throw new NameTakenError();
    const row: ComponentRecord = { id: randomUUID(), name, status: 'active' };
    this.rows.push(row);
    return { ...row };
  }

  async rename(id: string, name: string): Promise<ComponentRecord> {
    if (this.taken(name, id)) throw new NameTakenError();
    const row = this.rows.find((r) => r.id === id)!;
    row.name = name;
    return { ...row };
  }

  async retireIfNotLastActive(id: string): Promise<ComponentRecord | 'last-active'> {
    const row = this.rows.find((r) => r.id === id)!;
    const activeCount = this.rows.filter((r) => r.status === 'active').length;
    if (row.status === 'active' && activeCount <= 1) return 'last-active';
    row.status = 'retired';
    return { ...row };
  }
}
