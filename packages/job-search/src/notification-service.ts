import { prisma, type Prisma } from '@jobmatch/database';
import type { NotificationLogDto } from '@jobmatch/types';

export function toNotificationLogDto(row: {
  id: string;
  userId: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  href: string | null;
  status: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationLogDto {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    channel: row.channel,
    title: row.title,
    body: row.body,
    href: row.href,
    status: row.status,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Persist an in-app notification (best-effort; never throws). */
export async function createInAppNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, unknown> | null;
  status?: string;
}): Promise<NotificationLogDto | null> {
  try {
    const row = await prisma.notificationLog.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: 'in_app',
        title: input.title.slice(0, 200),
        body: input.body.slice(0, 4_000),
        href: input.href ?? null,
        meta: input.meta
          ? (input.meta as unknown as Prisma.InputJsonValue)
          : undefined,
        status: input.status ?? 'delivered',
      },
    });
    return toNotificationLogDto(row);
  } catch {
    return null;
  }
}

export async function listNotifications(input: {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<{ notifications: NotificationLogDto[]; unreadCount: number }> {
  const take = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const where = {
    userId: input.userId,
    channel: 'in_app',
    ...(input.unreadOnly ? { readAt: null } : {}),
  };

  const [rows, unreadCount] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.notificationLog.count({
      where: { userId: input.userId, channel: 'in_app', readAt: null },
    }),
  ]);

  return {
    notifications: rows.map(toNotificationLogDto),
    unreadCount,
  };
}

export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<NotificationLogDto | null> {
  const existing = await prisma.notificationLog.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;
  if (existing.readAt) return toNotificationLogDto(existing);

  const row = await prisma.notificationLog.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return toNotificationLogDto(row);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notificationLog.updateMany({
    where: { userId, channel: 'in_app', readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
