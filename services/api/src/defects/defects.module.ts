import { Module } from '@nestjs/common';
import { ActorGuard } from './current-actor';
import { DEFECT_REPOSITORY, USER_DIRECTORY } from './defect.repository';
import { DefectsController } from './defects.controller';
import { PgDefectRepository } from './pg-defect.repository';
import { PgUserDirectory } from './pg-user-directory';
import { StatusMoveService } from './status-move.service';

@Module({
  controllers: [DefectsController],
  providers: [
    ActorGuard,
    StatusMoveService,
    { provide: DEFECT_REPOSITORY, useClass: PgDefectRepository },
    { provide: USER_DIRECTORY, useClass: PgUserDirectory },
  ],
})
export class DefectsModule {}
