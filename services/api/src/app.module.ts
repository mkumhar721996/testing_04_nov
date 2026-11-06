import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DefectsModule } from './defects/defects.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, HealthModule, DashboardModule, DefectsModule] })
export class AppModule {}
