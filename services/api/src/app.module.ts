import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DefectsModule } from './defects/defects.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    ComponentsModule,
    DashboardModule,
    DefectsModule,
  ],
})
export class AppModule {}
