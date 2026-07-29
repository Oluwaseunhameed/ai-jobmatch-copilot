import { getConnection } from '@jobmatch/queue';

const inFlight = new Map<string, Promise<unknown>>();

function redisConfigured(): boolean {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return false;
  // Mirror packages/queue: never hit developer-machine Redis from Vercel.
  if (
    (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) &&
    /localhost|127\.0\.0\.1/i.test(url)
  ) {
    return false;
  }
  return true;
}

async function tryGetConnection() {
  if (!redisConfigured()) return null;
  try {
    return getConnection();
  } catch {
    return null;
  }
}

async function getJson<T>(key: string): Promise<T | null> {
  const conn = await tryGetConnection();
  if (!conn) return null;

  try {
    const raw = await conn.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    // Redis down / timed out — fall through to DB compute.
    return null;
  }
}

async function setJson<T>(key: string, value: T, ttlSeconds: number) {
  const conn = await tryGetConnection();
  if (!conn) return;

  try {
    await conn.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Best-effort write; ignore failures.
  }
}

export async function withRedisJsonCache<T>(args: {
  key: string;
  ttlSeconds: number;
  compute: () => Promise<T>;
  /**
   * If false, the computed value won't be written back to Redis.
   * Useful for "not found" results so they don't permanently poison the cache.
   */
  shouldCache?: (value: T) => boolean;
}): Promise<T> {
  const { key, ttlSeconds, compute, shouldCache } = args;

  const cached = await getJson<T>(key);
  if (cached !== null) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = compute()
    .then((value) => {
      if (shouldCache ? shouldCache(value) : true) {
        void setJson(key, value, ttlSeconds);
      }
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Best-effort invalidation after mutations. Safe when Redis is unavailable. */
export async function invalidateRedisKeys(...keys: string[]) {
  const conn = await tryGetConnection();
  if (!conn || keys.length === 0) return;
  try {
    await conn.del(...keys);
  } catch {
    // ignore — TTL will eventually expire stale entries
  }
}
