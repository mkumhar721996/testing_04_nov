import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ActorGuard, CurrentActor } from './current-actor';
import { ActorIdentity, StatusMoveService } from './status-move.service';
import { STATUSES, Status } from './workflow';

@Controller('defects')
@UseGuards(ActorGuard)
export class DefectsController {
  constructor(private readonly moves: StatusMoveService) {}

  @Get(':id')
  view(@Param('id') id: string, @CurrentActor() actor: ActorIdentity) {
    return this.moves.view(id, actor);
  }

  @Post(':id/comments')
  @HttpCode(201)
  comment(@Param('id') id: string, @CurrentActor() actor: ActorIdentity, @Body() body: unknown) {
    return this.moves.addComment(id, actor, (body as Record<string, unknown> | undefined)?.text);
  }

  @Post(':id/status-moves')
  @HttpCode(200)
  move(
    @Param('id') id: string,
    @CurrentActor() actor: ActorIdentity,
    @Body() body: unknown,
  ) {
    const { to, expectedVersion, reason } = (body ?? {}) as Record<string, unknown>;
    if (typeof to !== 'string' || !(STATUSES as readonly string[]).includes(to))
      throw new BadRequestException('"to" must be a known status.');
    if (!Number.isInteger(expectedVersion))
      throw new BadRequestException('"expectedVersion" must be an integer.');
    if (reason !== undefined && typeof reason !== 'string')
      throw new BadRequestException('"reason" must be text.');
    return this.moves.move(id, actor, {
      to: to as Status,
      expectedVersion: expectedVersion as number,
      reason,
    });
  }
}
