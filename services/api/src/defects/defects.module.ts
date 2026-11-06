import { Module } from '@nestjs/common';
import { ActorGuard } from './current-actor';
import { DEFECT_REPOSITORY } from './defect.repository';
import { DefectsController } from './defects.controller';
import { PgDefectRepository } from './pg-defect.repository';
import { StatusMoveService } from './status-move.service';

@Module({
  controllers: [DefectsController],
  providers: [
    ActorGuard,
    StatusMoveService,
    { provide: DEFECT_REPOSITORY, useClass: PgDefectRepository },
  ],
})
export class DefectsModule {}
