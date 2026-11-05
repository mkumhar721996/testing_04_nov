import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

// The pool connects lazily, so the app starts without a reachable database.
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({
          connectionString:
            process.env.DATABASE_URL ??
            'postgresql://postgres:postgres@localhost:5432/core_api',
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
