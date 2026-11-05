import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DefectsModule } from './defects/defects.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, HealthModule, DefectsModule] })
export class AppModule {}
