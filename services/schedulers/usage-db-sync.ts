import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { DRIZZLE_DB, type DrizzleDB } from 'src/database/database.module';
import { usage } from 'src/database/schema';
import { REDIS_CLIENT } from 'src/infra/redis.module';
import {
  USAGE_DIRTY_KEY,
  USAGE_SYNC_LOCK_KEY,
  usageKeyFor,
} from 'src/guards/usage.guard';

@Injectable()
export class UsageDBSync implements OnApplicationShutdown {
  private readonly logger = new Logger(UsageDBSync.name);
  private running = false;

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Cron('*/5 * * * *')
  async flushUsage() {
    if (this.running) return;
    this.running = true;
    try {
      // multi-instance: only one instance flushes per tick
      const locked = await this.redis.set(
        USAGE_SYNC_LOCK_KEY,
        '1',
        'EX',
        240,
        'NX',
      );
      if (!locked) return;
      await this.flush();
    } catch (err) {
      this.logger.error('Usage flush failed', err);
    } finally {
      this.running = false;
    }
  }

  async onApplicationShutdown() {
    try {
      await this.flush(); // safe without the lock: writes are idempotent (GREATEST below)
    } catch (err) {
      this.logger.error('Final usage flush failed', err);
    }
  }

  private async flush() {
    const members = await this.redis.smembers(USAGE_DIRTY_KEY);
    if (members.length === 0) return;

    // remove BEFORE reading counters: any increment after this re-adds the member
    await this.redis.srem(USAGE_DIRTY_KEY, ...members);

    const parsed = members.map((member) => {
      const i = member.lastIndexOf(':');
      return { userId: member.slice(0, i), period: member.slice(i + 1) };
    });

    const pipe = this.redis.pipeline();
    parsed.forEach((p) =>
      pipe.hget(usageKeyFor(p.userId, p.period), 'events_used'),
    );
    const results = await pipe.exec();

    const rows: { user_id: string; period: string; events_used: number }[] = [];
    parsed.forEach((p, i) => {
      const value = results?.[i]?.[1];
      if (value !== null && value !== undefined) {
        rows.push({
          user_id: p.userId,
          period: p.period,
          events_used: Number(value),
        });
      }
    });

    try {
      for (let i = 0; i < rows.length; i += 500) {
        await this.db
          .insert(usage)
          .values(rows.slice(i, i + 500)) // one round trip per 500 users, not one per user
          .onConflictDoUpdate({
            target: [usage.user_id, usage.period],
            set: {
              events_used: sql`greatest(${usage.events_used}, excluded.events_used)`, // never decreases
              updated_at: new Date(),
            },
          });
      }
    } catch (err) {
      await this.redis.sadd(USAGE_DIRTY_KEY, ...members); // retry on the next tick
      throw err;
    }
  }
}
