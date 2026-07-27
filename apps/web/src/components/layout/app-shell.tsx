'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Code2,
  Compass,
  FileText,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  MessageSquareQuote,
  Route,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { BrandMark } from '@/components/brand/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/applications', label: 'Applications', icon: KanbanSquare },
    ],
  },
  {
    label: 'Career',
    items: [
      { href: '/interview', label: 'Interview', icon: MessageSquareQuote },
      { href: '/practice', label: 'Practice', icon: Code2 },
      { href: '/growth', label: 'Growth', icon: Route },
      { href: '/coach', label: 'Coach', icon: Compass },
      { href: '/portfolio', label: 'Portfolio', icon: FolderKanban },
      { href: '/resumes', label: 'Resumes', icon: FileText },
      { href: '/profile', label: 'Profile', icon: UserRound },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/settings/account', label: 'Settings', icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/settings/account') return pathname.startsWith('/settings');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
        active
          ? 'bg-secondary/80 font-medium text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-opacity',
          active ? 'bg-primary opacity-100' : 'opacity-0',
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarChrome({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border/80 bg-card/90',
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border/80 px-4">
        <BrandMark href="/dashboard" size="sm" compact className="min-w-0" />
      </div>

      <SidebarNav pathname={pathname} onNavigate={onNavigate} />

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
}

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
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

  return (
    <div className="relative min-h-screen md:flex">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen w-60 shrink-0 md:block lg:w-64">
        <SidebarChrome pathname={pathname} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,88vw)] animate-enter shadow-lift">
            <SidebarChrome pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar only */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md md:hidden">
          <BrandMark href="/dashboard" size="sm" compact />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {title && (
            <h1 className="animate-enter mb-6 font-display text-3xl font-semibold tracking-tight">
              {title}
            </h1>
          )}
          <div className="animate-enter-delayed">{children}</div>
        </main>
      </div>
    </div>
  );
}
