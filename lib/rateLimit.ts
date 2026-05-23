import { createClient } from "redis";

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  backend: "redis" | "memory";
};

const memoryBuckets =
  globalThis.__vrRateLimitBuckets ||
  new Map<string, { count: number; resetAt: number }>();
globalThis.__vrRateLimitBuckets = memoryBuckets;

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnecting: Promise<ReturnType<typeof createClient> | null> | null =
  null;

declare global {
  // eslint-disable-next-line no-var
  var __vrRateLimitBuckets:
    | Map<string, { count: number; resetAt: number }>
    | undefined;
}

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const realIp = req.headers.get("x-real-ip") ?? "";
  return (forwarded.split(",")[0]?.trim() || realIp || "unknown").slice(0, 80);
}

async function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient?.isOpen) return redisClient;
  if (redisConnecting) return redisConnecting;

  redisConnecting = (async () => {
    try {
      const client = createClient({ url, socket: { connectTimeout: 1500 } });
      client.on("error", () => {
        redisClient = null;
        redisConnecting = null;
      });
      await Promise.race([
        client.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Redis connect timeout")), 1500),
        ),
      ]);
      redisClient = client;
      return client;
    } catch {
      redisClient = null;
      return null;
    } finally {
      redisConnecting = null;
    }
  })();

  return redisConnecting;
}

function pruneMemoryBuckets(now: number) {
  if (memoryBuckets.size < 5000) return;
  memoryBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  });
}

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneMemoryBuckets(now);

  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    backend: "memory" as const,
  };
}

export async function checkRecommendationRateLimit(
  req: Request,
): Promise<RateLimitResult> {
  const limit = Number(process.env.RECOMMENDATIONS_RATE_LIMIT_MAX || 10);
  const windowMs = Number(
    process.env.RECOMMENDATIONS_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
  );
  const key = `recommendations:${getClientIp(req)}`;
  const redis = await getRedisClient();

  if (!redis) return memoryRateLimit(key, limit, windowMs);

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pExpire(key, windowMs);
    const ttl = await redis.pTTL(key);
    const retryAfterSeconds = Math.max(1, Math.ceil(ttl / 1000));
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: Date.now() + Math.max(0, ttl),
      retryAfterSeconds,
      backend: "redis",
    };
  } catch {
    return memoryRateLimit(key, limit, windowMs);
  }
}

export function rateLimitHeaders(rate: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
    "X-RateLimit-Backend": rate.backend,
    ...(rate.allowed ? {} : { "Retry-After": String(rate.retryAfterSeconds) }),
  };
}
