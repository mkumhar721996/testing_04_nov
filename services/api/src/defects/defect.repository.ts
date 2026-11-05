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
  /**
   * Atomic, version-checked: sets owner_id/owner_name (both null to remove) and bumps
   * row_version. Returns false when the version had changed. Never touches status.
   */
  setOwner(
    id: string,
    expectedVersion: number,
    owner: { id: string; name: string } | null,
  ): Promise<boolean>;
}

export const USER_DIRECTORY = 'USER_DIRECTORY';

export interface DirectoryUser {
  id: string;
  name: string;
}

export interface UserDirectory {
  listDevelopers(): Promise<DirectoryUser[]>;
  findDeveloper(id: string): Promise<DirectoryUser | null>;
}
