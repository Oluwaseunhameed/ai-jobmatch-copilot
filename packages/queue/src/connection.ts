import IORedis, { type Redis } from 'ioredis';

/**
 * Redis connection management for BullMQ.
 *
 * When Redis is not configured the queue reports itself as disabled rather than
 * throwing, which lets callers fall back to running work inline in development.
 */
export function redisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url ? url : null;
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
