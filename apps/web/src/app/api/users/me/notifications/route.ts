import { NextResponse } from 'next/server';
import { markAllNotificationsRead, markNotificationRead } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedNotifications,
  invalidateNotificationsCache,
} from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await getCachedNotifications({
      userId: app.user.id,
      unreadOnly,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // DB outages should not take down the shell; return empty inbox.
    console.error('[notifications] list failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { notifications: [], unreadCount: 0 },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function PATCH(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const idFromQuery = url.searchParams.get('id');

  if (idFromQuery) {
    const notification = await markNotificationRead(app.user.id, idFromQuery);
    if (!notification) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }
    await invalidateNotificationsCache(app.user.id);
    return NextResponse.json(notification);
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  if (body.all === true) {
    const count = await markAllNotificationsRead(app.user.id);
    await invalidateNotificationsCache(app.user.id);
    return NextResponse.json({ ok: true, count });
  }

  return NextResponse.json({ error: { message: 'Provide ?id= or { "all": true }' } }, { status: 400 });
}
