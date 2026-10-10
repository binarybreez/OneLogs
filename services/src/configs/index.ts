export const VERSION = 'v1';

export type CachedKey = {
  user_id: string;
  apikeyDigest: string;
  expiresAt: number;
};

export const LAST_USED_HASH = `ol:api_key:last_used:${VERSION}`;
export const LAST_USED_DEBOUNCE_SEC = 60;
export const LRU_SOFT_TTL_MS = 5 * 60 * 1000;
export const REDIS_HARD_TTL = 10 * 60;

export const apiKeyRedisKey = (keyId: string) =>
  `ol:api_key:${VERSION}:${keyId}`;
export const localCacheKey = (keyId: string) => `${VERSION}:${keyId}`;

export const MAX_LIMIT = 500;
export const PLAN_LRU_TTL_MS = 5 * 60 * 1_000;
export const PLAN_REDIS_TTL_SEC = 6 * 60;

export const planRedisKey = (userId: string) => `ol:plan:${VERSION}:${userId}`;
export const usageRedisKey = (userId: string) => `age:${VERSION}:${userId}`;

export const hardLockedRedisKey = (userId: string) => `user:${userId}:locked`;

export enum PlanTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  BUSINESS = 'business',
}

export const PLAN_DEFAULTS: Record<PlanTier, { events_limit: number }> = {
  [PlanTier.FREE]: { events_limit: 10000 },
  [PlanTier.STARTER]: { events_limit: 100000 },
  [PlanTier.PRO]: { events_limit: 500000 },
  [PlanTier.BUSINESS]: { events_limit: 1000000 },
};

export function normalizePlanTier(raw: string | undefined | null): PlanTier {
  const lower = raw?.toLowerCase();
  if (Object.values(PlanTier).includes(lower as PlanTier)) {
    return lower as PlanTier;
  }
  return PlanTier.FREE;
}
