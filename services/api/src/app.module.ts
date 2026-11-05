import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({ imports: [DatabaseModule, HealthModule, AuthModule, ComponentsModule] })
export class AppModule {}
