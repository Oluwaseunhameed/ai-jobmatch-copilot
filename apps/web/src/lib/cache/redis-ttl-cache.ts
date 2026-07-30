import { getCacheConnection, redisUrl } from '@jobmatch/queue';

const inFlight = new Map<string, Promise<unknown>>();

const REDIS_OP_MS = 1_200;

function redisConfigured(): boolean {
  return Boolean(redisUrl());
}

function tryGetCacheConnection() {
  if (!redisConfigured()) return null;
  try {
    return getCacheConnection();
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

async function getJson<T>(key: string): Promise<T | null> {
  const conn = tryGetCacheConnection();
  if (!conn) return null;

  try {
    const raw = await withTimeout(conn.get(key), REDIS_OP_MS, null);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJson<T>(key: string, value: T, ttlSeconds: number) {
  const conn = tryGetCacheConnection();
  if (!conn) return;

  try {
    await withTimeout(conn.set(key, JSON.stringify(value), 'EX', ttlSeconds), REDIS_OP_MS, 'OK');
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
  /** Hard ceiling for the DB/compute path so pages never hang forever. */
  computeTimeoutMs?: number;
}): Promise<T> {
  const { key, ttlSeconds, compute, shouldCache, computeTimeoutMs = 12_000 } = args;

  const cached = await getJson<T>(key);
  if (cached !== null) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        compute(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`cache compute timed out after ${computeTimeoutMs}ms`)),
            computeTimeoutMs,
          );
        }),
      ]);
      if (shouldCache ? shouldCache(value) : true) {
        void setJson(key, value, ttlSeconds);
      }
      return value;
    } finally {
      if (timer) clearTimeout(timer);
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/** Best-effort invalidation after mutations. Never blocks the request path. */
export async function invalidateRedisKeys(...keys: string[]) {
  if (keys.length === 0 || !redisConfigured()) return;

  void (async () => {
    const conn = tryGetCacheConnection();
    if (!conn) return;
    try {
      await withTimeout(conn.del(...keys), REDIS_OP_MS, 0);
    } catch {
      // ignore — TTL will eventually expire stale entries
    }
  })();
}
