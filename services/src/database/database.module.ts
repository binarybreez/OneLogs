import { neonConfig, Pool } from '@neondatabase/serverless';
import { Global, Module } from '@nestjs/common';
import { drizzle, NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import ws from 'ws';

export type DrizzleDB = NeonDatabase<typeof schema>;
export const DRIZZLE_DB = 'DRIZZLE_DB';
neonConfig.webSocketConstructor = ws;
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL is not defined');
        }
        const pool = new Pool({ connectionString });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_DB],
})
export class DatabaseModule {}
