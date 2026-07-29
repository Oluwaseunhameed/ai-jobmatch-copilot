import IORedis, { type Redis } from 'ioredis';

/**
 * Redis connection management for BullMQ.
 *
 * When Redis is not configured the queue reports itself as disabled rather than
 * throwing, which lets callers fall back to running work inline in development.
 */
export function redisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  // Vercel (and similar) serverless cannot reach a developer machine Redis.
  // A hanging localhost connect will 504 the whole page — treat as unset.
  if (
    (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) &&
    /localhost|127\.0\.0\.1/i.test(url)
  ) {
    return null;
  }

  return url;
}

export type QueueDriver = 'redis' | 'inline';

export function queueDriver(): QueueDriver {
  const explicit = process.env.QUEUE_DRIVER?.trim().toLowerCase();
  if (explicit === 'inline' || explicit === 'redis') {
    return explicit;
  }
  return redisUrl() ? 'redis' : 'inline';
}

export function isQueueEnabled(): boolean {
  return queueDriver() === 'redis' && Boolean(redisUrl());
}

let connection: Redis | null = null;

export function getConnection(): Redis {
  const url = redisUrl();
  if (!url) {
    throw new Error('REDIS_URL is not set — cannot create a Redis connection');
  }

  if (!connection) {
    connection = new IORedis(url, {
      // Required by BullMQ: it manages its own retry semantics for blocking commands.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 3_000,
      // Fail fast in serverless instead of retrying until the platform kills the invoke.
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1_000);
      },
    });
  }

  return connection;
}

export async function closeConnection() {
  if (connection) {
    await connection.quit().catch(() => undefined);
    connection = null;
  }
}
