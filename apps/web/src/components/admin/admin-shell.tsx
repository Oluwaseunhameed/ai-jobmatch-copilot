'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Flag,
  LayoutDashboard,
  Menu,
  Briefcase,
  CreditCard,
  Users,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { BrandMark } from '@/components/brand/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/flags', label: 'Flags', icon: Flag },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        Admin
      </p>
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-secondary/80 font-medium text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-primary' : '')} />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-6 px-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to app
        </Link>
      </div>
    </nav>
  );

  const aside = (
    <aside className="flex h-full flex-col border-r border-border/80 bg-card/90">
      <div className="flex h-16 shrink-0 items-center border-b border-border/80 px-4">
        <BrandMark href="/admin" size="sm" compact className="min-w-0" />
      </div>
      {nav}
      <div className="mt-auto shrink-0 space-y-2 border-t border-border/80 p-3">
        <div className="flex items-center justify-between gap-2 rounded-md px-1">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
        <div className="px-1">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative min-h-screen md:flex">
      <div className="sticky top-0 hidden h-screen w-60 shrink-0 md:block lg:w-64">{aside}</div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-foreground/25 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] animate-enter shadow-lift">
            {aside}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md md:hidden">
          <BrandMark href="/admin" size="sm" compact />
          <Tooltip content={open ? 'Close menu' : 'Open menu'}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </Tooltip>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
