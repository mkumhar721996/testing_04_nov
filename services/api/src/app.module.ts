import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DefectsModule } from './defects/defects.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, HealthModule, DashboardModule, DefectsModule, CartModule] })
export class AppModule {}
