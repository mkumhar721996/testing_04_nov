import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFECT_REPOSITORY, DefectRepository } from './defect.repository';
import { Actor, availableMoves, Status, StatusMove } from './workflow';

export const MAX_REASON_LENGTH = 2000;
export const MAX_COMMENT_LENGTH = 2000;
export const CONFLICT_MESSAGE =
  'This defect was changed by someone else. Refresh to see its current status, then try again.';

export interface ActorIdentity extends Actor {
  name: string;
}

export interface StatusMoveRequest {
  to: Status;
  expectedVersion: number;
  reason?: string;
}

export interface DefectDetail {
  id: string;
  key: string;
  title: string;
  status: Status;
  rowVersion: number;
  ownerId: string | null;
  ownerName: string | null;
  comments: { id: string; authorName: string; body: string; createdAt: Date }[];
  availableMoves: StatusMove[];
  viewerName: string;
}

// Reason comments are stored with the prefix the approved design shows.
const COMMENT_PREFIX: Partial<Record<Status, string>> = {
  Rejected: 'Rejected',
  Triaged: 'Reopened',
};

@Injectable()
export class StatusMoveService {
  constructor(@Inject(DEFECT_REPOSITORY) private readonly repo: DefectRepository) {}

  async view(id: string, actor: ActorIdentity): Promise<DefectDetail> {
    const defect = await this.repo.findById(id);
    if (!defect) throw new NotFoundException('Defect not found.');
    const comments = await this.repo.listComments(id);
    return {
      id: defect.id,
      key: defect.key,
      title: defect.title,
      status: defect.status,
      rowVersion: defect.rowVersion,
      ownerId: defect.ownerId,
      ownerName: defect.ownerName,
      comments: comments.map(({ id: cid, authorName, body, createdAt }) => ({
        id: cid,
        authorName,
        body,
        createdAt,
      })),
      availableMoves: availableMoves(defect, actor),
      viewerName: actor.name,
    };
  }

  // Validation runs before any write, so a refused comment leaves the list unchanged.
  async addComment(id: string, actor: ActorIdentity, text: unknown): Promise<DefectDetail> {
    if (!(await this.repo.findById(id))) throw new NotFoundException('Defect not found.');
    const body = typeof text === 'string' ? text.trim() : '';
    if (!body)
      throw new BadRequestException('Comment cannot be empty. Enter some text, then post again.');
    if (body.length > MAX_COMMENT_LENGTH)
      throw new BadRequestException(`The comment must be at most ${MAX_COMMENT_LENGTH} characters.`);
    await this.repo.addComment(id, { authorId: actor.id, authorName: actor.name, body });
    return this.view(id, actor);
  }

  // Check order matters: version first (a stale client learns the current status), then
  // permission, then reason, so a refused move never writes anything.
  async move(id: string, actor: ActorIdentity, req: StatusMoveRequest): Promise<DefectDetail> {
    const defect = await this.repo.findById(id);
    if (!defect) throw new NotFoundException('Defect not found.');
    if (req.expectedVersion !== defect.rowVersion) await this.conflict(id, actor);

    const move = availableMoves(defect, actor).find((m) => m.to === req.to);
    if (!move) throw new ForbiddenException('That status move is not available to you.');

    let comment;
    if (move.requiresReason) {
      const reason = (req.reason ?? '').trim();
      if (!reason) throw new BadRequestException('A reason is required for this move.');
      if (reason.length > MAX_REASON_LENGTH)
        throw new BadRequestException(`The reason must be at most ${MAX_REASON_LENGTH} characters.`);
      comment = {
        authorId: actor.id,
        authorName: actor.name,
        body: `${COMMENT_PREFIX[move.to]}: ${reason}`,
      };
    }

    const moved = await this.repo.moveStatus(id, req.expectedVersion, move.to, comment);
    if (!moved) await this.conflict(id, actor);
    return this.view(id, actor);
  }

  private async conflict(id: string, actor: ActorIdentity): Promise<never> {
    const defect = await this.view(id, actor);
    throw new ConflictException({
      message: CONFLICT_MESSAGE,
      currentStatus: defect.status,
      defect,
    });
  }
}
