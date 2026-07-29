import { getConnection } from '@jobmatch/queue';

const inFlight = new Map<string, Promise<unknown>>();

async function tryGetConnection() {
  try {
    return getConnection();
  } catch {
    return null;
  }
}

async function getJson<T>(key: string): Promise<T | null> {
  const conn = await tryGetConnection();
  if (!conn) return null;

  const raw = await conn.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson<T>(key: string, value: T, ttlSeconds: number) {
  const conn = await tryGetConnection();
  if (!conn) return;

  await conn.set(key, JSON.stringify(value), 'EX', ttlSeconds);
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
