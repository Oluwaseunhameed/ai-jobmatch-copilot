'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationLog,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

const POLL_MS = 60_000;

export function NotificationBell({
  className,
  /** Prefer `start` in the left sidebar so the panel opens into the main content. */
  align = 'end',
}: {
  className?: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications({ limit: 20 });
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Delay first fetch by 1.5 s so it doesn't compete with the page's own data loading.
    const initial = window.setTimeout(() => void refresh(), 1_500);
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const onMarkRead = async (id: string) => {
    await markNotificationRead(id);
    void refresh();
  };

  const onMarkAll = async () => {
    await markAllNotificationsRead();
    void refresh();
  };

  return (
    <div ref={panelRef} className={cn('relative', className)}>
      <Tooltip content={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </Tooltip>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-card shadow-lift',
            align === 'start' ? 'left-0' : 'right-0',
          )}
        >
          <div className="flex items-center justify-between border-b border-border/80 px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void onMarkAll()}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {loading && items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <div
                    className={cn(
                      'border-b border-border/50 px-3 py-2.5 last:border-0',
                      !n.readAt && 'bg-muted/40',
                    )}
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="block text-sm font-medium hover:underline"
                        onClick={() => {
                          if (!n.readAt) void onMarkRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{n.title}</p>
                    )}
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <time className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </time>
                      {!n.readAt && (
                        <button
                          type="button"
                          className="cursor-pointer text-[10px] text-primary hover:underline"
                          onClick={() => void onMarkRead(n.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
