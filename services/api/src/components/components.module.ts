import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from '../me/me.controller';
import { ComponentsController } from './components.controller';
import { COMPONENTS_REPOSITORY, PgComponentsRepository } from './components.repository';
import { ComponentsService } from './components.service';

@Module({
  imports: [AuthModule],
  controllers: [ComponentsController, MeController],
  providers: [
    ComponentsService,
    { provide: COMPONENTS_REPOSITORY, useClass: PgComponentsRepository },
  ],
  exports: [ComponentsService],
})
export class ComponentsModule {}
