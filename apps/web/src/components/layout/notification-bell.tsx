'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
const PANEL_WIDTH_PX = 320;
const PANEL_GAP_PX = 8;
const VIEWPORT_PAD_PX = 8;

type PanelCoords = { top: number; left: number };

function computePanelCoords(
  trigger: DOMRect,
  align: 'start' | 'end',
): PanelCoords {
  const width = Math.min(PANEL_WIDTH_PX, window.innerWidth - VIEWPORT_PAD_PX * 2);
  let left =
    align === 'start' ? trigger.left : trigger.right - width;

  left = Math.min(
    Math.max(VIEWPORT_PAD_PX, left),
    window.innerWidth - width - VIEWPORT_PAD_PX,
  );

  const top = Math.min(
    trigger.bottom + PANEL_GAP_PX,
    window.innerHeight - VIEWPORT_PAD_PX,
  );

  return { top, left };
}

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
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
    setMounted(true);
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

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    setCoords(computePanelCoords(trigger, align));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  const onMarkRead = async (id: string) => {
    await markNotificationRead(id);
    void refresh();
  };

  const onMarkAll = async () => {
    await markAllNotificationsRead();
    void refresh();
  };

  const panel =
    open && mounted && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="fixed z-[100] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card shadow-lift"
            style={{ top: coords.top, left: coords.left }}
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
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Tooltip content={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
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
      {panel}
    </div>
  );
}
