import getRedisClient from "./redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
};

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();

  if (redis) {
    return checkRedisRateLimit(redis, key, config);
  }

  return checkMemoryRateLimit(key, config);
}

async function checkRedisRateLimit(
  redis: ReturnType<typeof getRedisClient>,
  key: string,
  config: RateLimitConfig
) {
  if (!redis) {
    return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs };
  }

  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Use sorted set with timestamps
    await redis.zremrangebyscore(redisKey, "-inf", windowStart.toString());
    const count = await redis.zcard(redisKey);

    if (count >= config.maxRequests) {
      const oldestEntry = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const resetAt = oldestEntry.length >= 2
        ? parseInt(oldestEntry[1]) + config.windowMs
        : now + config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    await redis.zadd(redisKey, now.toString(), `${now}-${Math.random()}`);
    await redis.pexpire(redisKey, config.windowMs);

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: now + config.windowMs,
    };
  } catch {
    return { allowed: true, remaining: config.maxRequests, resetAt: now + config.windowMs };
  }
}

function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Cleanup old memory entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);

// Pre-configured rate limits
export const RATE_LIMITS = {
  chat: { windowMs: 60 * 1000, maxRequests: 20 },
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
  api: { windowMs: 60 * 1000, maxRequests: 60 },
};
