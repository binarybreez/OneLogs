import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import {
  normalizePlanTier,
  PLAN_DEFAULTS,
  PLAN_LRU_TTL_MS,
  PLAN_REDIS_TTL_SEC,
  planRedisKey,
  PlanTier,
  usageRedisKey,
  VERSION,
} from 'src/configs';
import { DRIZZLE_DB, type DrizzleDB } from 'src/database/database.module';
import { REDIS_CLIENT } from 'src/infra/redis.module';
import type { AuthenticatedRequest } from './auth.guard';

export const currentPeriod = (d = new Date()) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export const usageKeyFor = (userId: string, period: string) =>
  usageRedisKey(`${userId}:${period}`);

export type QuotaRequest = AuthenticatedRequest & { plan?: PlanTier };

const USAGE_LRU_TTL_MS = 5_000;

// no updateAgeOnGet: reads must not extend TTL, or hot entries never refresh
export const planCache = new LRUCache<string, PlanTier>({
  max: 50_000,
  ttl: PLAN_LRU_TTL_MS,
});
export const usageCache = new LRUCache<string, number>({
  max: 50_000,
  ttl: USAGE_LRU_TTL_MS,
});

export const USAGE_DIRTY_KEY = `ol:usage:dirty:${VERSION}`;
export const USAGE_SYNC_LOCK_KEY = `ol:usage:sync-lock:${VERSION}`;
export const USAGE_KEY_TTL_SEC = 40 * 24 * 3600;

@Injectable()
export class UsageGuard implements CanActivate {
  private readonly logger = new Logger(UsageGuard.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async resolveTier(userId: string): Promise<PlanTier> {
    const cached = planCache.get(userId);
    if (cached) return cached;

    const rkey = planRedisKey(userId);
    const fromRedis = await this.redis.hget(rkey, 'tier');
    if (fromRedis) {
      const tier = normalizePlanTier(fromRedis);
      planCache.set(userId, tier);
      return tier;
    }

    const row = await this.db.query.plan.findFirst({
      where: (p) => eq(p.user_id, userId),
      columns: { tier: true },
    });
    const tier = normalizePlanTier(row?.tier);
    await this.redis
      .multi()
      .hset(rkey, { tier })
      .expire(rkey, PLAN_REDIS_TTL_SEC)
      .exec();
    planCache.set(userId, tier);
    return tier;
  }

  private async resolveUsed(userId: string, period: string): Promise<number> {
    const lruKey = `${userId}:${period}`;
    const cached = usageCache.get(lruKey);
    if (cached !== undefined) return cached;

    const rkey = usageKeyFor(userId, period);
    const fromRedis = await this.redis.hget(rkey, 'events_used');
    if (fromRedis !== null) {
      const used = Number(fromRedis);
      usageCache.set(lruKey, used);
      return used;
    }

    const row = await this.db.query.usage.findFirst({
      where: (u) => and(eq(u.user_id, userId), eq(u.period, period)),
      columns: { events_used: true },
    });
    const used = row?.events_used ?? 0;
    // HSETNX: never overwrite a newer value the consumer wrote while we were reading Postgres
    await this.redis
      .multi()
      .hsetnx(rkey, 'events_used', String(used))
      .expire(rkey, PLAN_REDIS_TTL_SEC)
      .exec();
    usageCache.set(lruKey, used);
    return used;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<QuotaRequest>();
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Unauthorised');

    try {
      const tier = await this.resolveTier(userId);
      request.plan = tier;
      const limit = (PLAN_DEFAULTS[tier] ?? PLAN_DEFAULTS[PlanTier.FREE])
        .events_limit;
      const used = await this.resolveUsed(userId, currentPeriod());

      if (used >= limit) {
        // was inverted (`<`)
        throw new HttpException(
          {
            statusCode: 429,
            code: 'QUOTA_EXCEEDED',
            message:
              'Monthly event limit reached. Upgrade your plan to ingest more events.',
            events_used: used,
            events_limit: limit,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // fail OPEN: losing customer telemetry because the billing check broke is worse
      // than a small overshoot. Flip to `throw` if you prefer fail-closed.
      this.logger.error('Quota check failed, allowing request', err);
      return true;
    }
  }
}
