import { randomUUID } from 'node:crypto';
import {
  CommentRecord,
  DefectRecord,
  DefectRepository,
  NewComment,
} from './defect.repository';
import { Status } from './workflow';

/** Test double for DefectRepository, with the same version-check semantics as Postgres. */
export class InMemoryDefectRepository implements DefectRepository {
  private defects = new Map<string, DefectRecord>();
  private comments = new Map<string, CommentRecord[]>();

  seed(defect: Partial<DefectRecord> & { status: Status }): DefectRecord {
    const record: DefectRecord = {
      id: randomUUID(),
      key: 'DEF-1',
      title: 'Sample defect',
      ownerId: null,
      ownerName: null,
      rowVersion: 1,
      ...defect,
    };
    this.defects.set(record.id, record);
    return record;
  }

  async findById(id: string) {
    const d = this.defects.get(id);
    return d ? { ...d } : null;
  }

  async listComments(defectId: string) {
    return [...(this.comments.get(defectId) ?? [])];
  }

  async moveStatus(id: string, expectedVersion: number, to: Status, comment?: NewComment) {
    const d = this.defects.get(id);
    if (!d || d.rowVersion !== expectedVersion) return false;
    d.status = to;
    d.rowVersion += 1;
    if (comment) {
      const list = this.comments.get(id) ?? [];
      list.push({ id: randomUUID(), createdAt: new Date(), ...comment });
      this.comments.set(id, list);
    }
    return true;
  }

  async setOwner(
    id: string,
    expectedVersion: number,
    owner: { id: string; name: string } | null,
  ) {
    const d = this.defects.get(id);
    if (!d || d.rowVersion !== expectedVersion) return false;
    d.ownerId = owner?.id ?? null;
    d.ownerName = owner?.name ?? null;
    d.rowVersion += 1;
    return true;
  }
}
