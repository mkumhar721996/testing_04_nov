import { Status } from './workflow';

export const DEFECT_REPOSITORY = 'DEFECT_REPOSITORY';

export interface DefectRecord {
  id: string;
  key: string;
  title: string;
  status: Status;
  ownerId: string | null;
  ownerName: string | null;
  rowVersion: number;
}

export interface CommentRecord {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

export interface NewComment {
  authorId: string;
  authorName: string;
  body: string;
}

export interface DefectRepository {
  findById(id: string): Promise<DefectRecord | null>;
  listComments(defectId: string): Promise<CommentRecord[]>;
  /**
   * Atomic: updates status only if row_version still equals `expectedVersion`, bumps it, and
   * inserts the comment (when given) in the SAME transaction. Returns false when the version
   * had changed.
   */
  moveStatus(
    id: string,
    expectedVersion: number,
    to: Status,
    comment?: NewComment,
  ): Promise<boolean>;
}
