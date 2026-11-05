import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ActorGuard, CurrentActor } from './current-actor';
import { ActorIdentity, StatusMoveService } from './status-move.service';
import { STATUSES, Status } from './workflow';

@Controller()
@UseGuards(ActorGuard)
export class DefectsController {
  constructor(private readonly moves: StatusMoveService) {}

  @Get('developers')
  developers(@CurrentActor() actor: ActorIdentity) {
    return this.moves.listDevelopers(actor);
  }

  @Put('defects/:id/owner')
  setOwner(
    @Param('id') id: string,
    @CurrentActor() actor: ActorIdentity,
    @Body() body: unknown,
  ) {
    const { ownerId, expectedVersion } = (body ?? {}) as Record<string, unknown>;
    if (ownerId !== null && typeof ownerId !== 'string')
      throw new BadRequestException('"ownerId" must be text or null.');
    if (!Number.isInteger(expectedVersion))
      throw new BadRequestException('"expectedVersion" must be an integer.');
    return this.moves.setOwner(id, actor, {
      ownerId,
      expectedVersion: expectedVersion as number,
    });
  }

  @Get('defects/:id')
  view(@Param('id') id: string, @CurrentActor() actor: ActorIdentity) {
    return this.moves.view(id, actor);
  }

  @Post('defects/:id/status-moves')
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
