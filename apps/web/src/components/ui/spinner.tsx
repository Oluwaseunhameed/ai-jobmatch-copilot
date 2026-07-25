import * as React from 'react';

import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
} as const;

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: keyof typeof SIZES;
  /** Announced to screen readers while the spinner is visible. */
  label?: string;
}

/** Indeterminate activity indicator. Inherits `currentColor`. */
export function Spinner({ size = 'sm', label = 'Loading', className, ...props }: SpinnerProps) {
  return (
    <>
      <svg
        role="presentation"
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        className={cn('animate-spin', SIZES[size], className)}
        {...props}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </>
  );
}

/** Centered spinner for panel- or page-level loading. */
export function SpinnerBlock({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center py-10 text-muted-foreground', className)}
    >
      <Spinner size="lg" label={label} />
    </div>
  );
}
