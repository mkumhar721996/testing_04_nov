import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, HealthModule, DashboardModule] })
export class AppModule {}
