import Link from 'next/link';

import { cn } from '@/lib/utils';

export function BrandMark({
  href = '/',
  className,
  size = 'md',
  showWordmark = true,
  compact = false,
}: {
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  /** Shorter wordmark for narrow sidebars */
  compact?: boolean;
}) {
  const mark =
    size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const word =
    size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <Link href={href} className={cn('group inline-flex min-w-0 items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-transform duration-300 group-hover:-translate-y-0.5',
          mark,
        )}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className="h-[58%] w-[58%]" fill="none">
          <path
            d="M8 22V10l8-4 8 4v12l-8 4-8-4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M16 12v12M8 10l8 4 8-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn('min-w-0 truncate font-display font-medium tracking-tight text-foreground', word)}>
          {compact ? (
            <>
              JobMatch <span className="text-primary">Copilot</span>
            </>
          ) : (
            <>
              AI JobMatch <span className="text-primary">Copilot</span>
            </>
          )}
        </span>
      )}
    </Link>
  );
}
