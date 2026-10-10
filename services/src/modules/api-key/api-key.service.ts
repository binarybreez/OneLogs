import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import Redis from 'ioredis';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from 'src/database/database.module';
import * as schema from 'src/database/schema';
import { api_key } from 'src/database/schema';
import { REDIS_CLIENT } from 'src/infra/redis.module';
import { randomBytes } from 'crypto';
import argon2 from 'argon2';
import { apiKeyRedisKey, LAST_USED_HASH, localCacheKey } from 'src/configs';
import { LRUCache } from 'lru-cache';
import { CacheInterface, LRU_CACHE } from 'src/infra/cache.module';

type DrizzleDB = NodePgDatabase<typeof schema>;

@Injectable()
export class APIKeyService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(LRU_CACHE)
    private readonly localCache: LRUCache<string, CacheInterface>,
  ) {}

  private generateKey(): { plaintextkey: string; keyId: string } {
    const keyId = crypto.randomUUID().replace(/-/g, '');
    const secret = randomBytes(32).toString('base64url');
    const plaintextkey = `OL_${keyId}_${secret}`;
    return { plaintextkey, keyId };
  }

  async createApiKey(user_id: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(api_key)
      .where(eq(api_key.user_id, user_id));

    if (result.count >= 5) {
      throw new BadRequestException('Maximum number of API keys reached');
    }
    const { keyId, plaintextkey } = this.generateKey();
    const hash = await argon2.hash(plaintextkey, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 1 << 16,
      parallelism: 1,
    });
    const prefix = plaintextkey.substring(0, 18) + '...';
    await this.db.insert(api_key).values({
      id: keyId,
      user_id: user_id,
      value: hash,
      prefix: prefix,
    });
    return { key: plaintextkey };
  }

  async listApiKeys(userId: string) {
    const apiKeys = await this.db
      .select({
        id: api_key.id,
        prefix: api_key.prefix,
        createdAt: api_key.createdAt,
        last_used_at: api_key.last_used_at,
        revoked_at: api_key.revoked_at,
      })
      .from(api_key)
      .where(eq(api_key.user_id, userId));
    return apiKeys;
  }

  async deleteApiKey(userId: string, keyId: string) {
    await this.db
      .update(api_key)
      .set({
        revoked_at: new Date(),
      })
      .where(and(eq(api_key.id, keyId), eq(api_key.user_id, userId)));

    await this.redis.del(apiKeyRedisKey(keyId));
    this.localCache.delete(localCacheKey(keyId));
  }

  async regenerateApiKey(user_id: string, oldKeyId: string) {
    const { keyId: newKeyId, plaintextkey } = this.generateKey();
    const hash = await argon2.hash(plaintextkey, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 1 << 16,
      parallelism: 1,
    });
    const prefix = plaintextkey.substring(0, 18) + '...';

    await this.db
      .update(api_key)
      .set({ revoked_at: new Date() })
      .where(and(eq(api_key.id, oldKeyId), eq(api_key.user_id, user_id)));

    await this.db.insert(api_key).values({
      id: newKeyId,
      user_id,
      value: hash,
      prefix,
    });

    await this.redis.del(apiKeyRedisKey(oldKeyId));
    this.localCache.delete(localCacheKey(oldKeyId));
    return { key: plaintextkey };
  }

  async getApiKeyLastUsed(userId: string, keyId: string) {
    const owned = await this.db.query.api_key.findFirst({
      where: (ak) => and(eq(ak.id, keyId), eq(ak.user_id, userId)),
      columns: { id: true },
    });
    if (!owned) {
      throw new UnauthorizedException('Not your API key');
    }

    const normalizedKey = keyId.replace(/-/g, '');
    const redisValue = await this.redis.hget(LAST_USED_HASH, normalizedKey);
    if (redisValue) {
      return { last_used_at: new Date(Number(redisValue)) };
    }
    const record = await this.db.query.api_key.findFirst({
      where: (ak) => eq(ak.id, keyId),
      columns: { last_used_at: true },
    });
    return { last_used_at: record?.last_used_at ?? null };
  }
}
