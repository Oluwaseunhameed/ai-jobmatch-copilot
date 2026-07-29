'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useT } from '@/components/i18n/locale-provider';
import { cn } from '@/lib/utils';

export function SettingsNav() {
  const pathname = usePathname();
  const t = useT();

  const links = [
    { href: '/settings/account', label: t.settings.account },
    { href: '/settings/security', label: t.settings.security },
    { href: '/settings/plan', label: t.settings.plan },
    { href: '/settings/team', label: 'Team' },
    { href: '/settings/referral', label: 'Referral' },
    { href: '/settings/appearance', label: t.settings.appearance },
    { href: '/settings/notifications', label: t.settings.notifications },
  ];

  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-border/80 pb-3">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              active
                ? 'bg-secondary text-secondary-foreground shadow-soft'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
