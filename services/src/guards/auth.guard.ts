import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import {
  apiKeyRedisKey,
  CachedKey,
  LAST_USED_DEBOUNCE_SEC,
  LAST_USED_HASH,
  localCacheKey,
  LRU_SOFT_TTL_MS,
  REDIS_HARD_TTL,
  VERSION,
} from 'src/configs';
import { DRIZZLE_DB } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { REDIS_CLIENT } from 'src/infra/redis.module';
import { extractKeyId } from 'src/utils/APIKeyVerifier';
import { digest } from 'src/utils/KeyDigest';
import { verifyToken } from '@clerk/backend';
import { LRU_CACHE } from 'src/infra/cache.module';

// augments the request with what this guard attaches, for req.user access downstream
export interface AuthenticatedRequest extends Request {
  user: { id: string; keyId?: string; [key: string]: unknown };
}
// header values can arrive duplicated as an array; normalize to a single string
function singleHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  constructor(
    @Inject(DRIZZLE_DB) private db: NeonHttpDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(LRU_CACHE) private readonly localCache: LRUCache<string, CachedKey>,
  ) {}

  private async trackApiKeyLastUsed(keyId: string) {
    try {
      const lockKey = `ol:apikey:last_used_lock:${VERSION}:${keyId}`;
      const ok = await this.redis.set(
        lockKey,
        '1',
        'EX',
        LAST_USED_DEBOUNCE_SEC,
        'NX',
      );
      if (!ok) return;
      await this.redis.hset(LAST_USED_HASH, keyId, Date.now().toString());
    } catch (err) {
      this.logger.warn('Failed to track last_used_at', err);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apikey = singleHeaderValue(request.headers['x-api-key']);

    if (apikey) {
      const keyId = extractKeyId(apikey);
      if (!keyId) throw new UnauthorizedException('Invalid API Key');
      const d = digest(apikey);
      const lrukey = localCacheKey(keyId);
      const now = Date.now();

      try {
        const c = this.localCache.get(lrukey);
        if (c && c.expiresAt > now && c.apikeyDigest === d) {
          request.user = { id: c.user_id, keyId };
          void this.trackApiKeyLastUsed(keyId);
          return true;
        }

        const rKeyDigest = apiKeyRedisKey(keyId);
        const rDigest = await this.redis.hgetall(rKeyDigest);
        if (rDigest?.invalid === '1') {
          throw new UnauthorizedException('Invalid API Key');
        }
        if (rDigest?.apikeyDigest && rDigest.apikeyDigest !== d) {
          throw new UnauthorizedException('Invalid API Key');
        }

        if (rDigest?.user_id) {
          this.localCache.set(lrukey, {
            user_id: rDigest.user_id,
            apikeyDigest: d,
            expiresAt: now + LRU_SOFT_TTL_MS,
          });
          request.user = { id: rDigest.user_id, keyId };
          void this.trackApiKeyLastUsed(keyId);
          return true;
        }

        const record = await this.db.query.api_key.findFirst({
          where: (ak) => and(eq(ak.id, keyId), isNull(ak.revoked_at)),
          columns: { value: true, user_id: true, revoked_at: true },
        });
        if (!record) throw new UnauthorizedException('Invalid API Key');

        const isValid = await argon2.verify(record.value, apikey);
        if (!isValid) {
          await this.redis.hset(rKeyDigest, { invalid: '1' });
          await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);
          throw new UnauthorizedException('Unauthorized');
        }

        await this.redis.hset(rKeyDigest, {
          user_id: record.user_id,
          apikeyDigest: d,
        });
        await this.redis.expire(rKeyDigest, REDIS_HARD_TTL);

        this.localCache.set(lrukey, {
          user_id: record.user_id,
          apikeyDigest: d,
          expiresAt: now + LRU_SOFT_TTL_MS,
        });

        request.user = { id: record.user_id, keyId };
        void this.trackApiKeyLastUsed(keyId);
        return true;
      } catch (error) {
        if (error instanceof UnauthorizedException) throw error;
        this.logger.error('API key auth failure', error);
        throw new InternalServerErrorException();
      }
    }

    const authHeader = singleHeaderValue(request.headers.authorization);
    const token = authHeader?.split(' ')[1];
    if (!token) throw new UnauthorizedException('Missing Authentication Token');
    try {
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      request.user = { id: verifiedToken.sub, ...verifiedToken };
      return true;
    } catch (error) {
      this.logger.warn('Clerk token verification failed', error);
      throw new UnauthorizedException('Invalid session token');
    }
  }
}
