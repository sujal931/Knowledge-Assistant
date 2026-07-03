import Redis from "ioredis";

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not set — caching and rate limiting disabled");
    return null;
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });
  }

  return redis;
}

export default getRedisClient;

// Simple cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 300
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch {
    // silently fail
  }
}
