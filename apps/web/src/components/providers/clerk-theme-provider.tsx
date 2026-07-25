'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';
import * as React from 'react';

/** Classic professional — charcoal + forest (matches globals.css) */
const LIGHT_VARS = {
  colorPrimary: '#1f4d3a',
  colorBackground: '#f7f6f3',
  colorInputBackground: '#ffffff',
  colorInputText: '#1c1917',
  borderRadius: '0.625rem',
  fontFamily: 'var(--font-ui), sans-serif',
};

const DARK_VARS = {
  colorPrimary: '#7d9f8c',
  colorBackground: '#1c1917',
  colorInputBackground: '#292524',
  colorInputText: '#fafaf9',
  borderRadius: '0.625rem',
  fontFamily: 'var(--font-ui), sans-serif',
};

const clerkElements = {
  rootBox: 'mx-auto w-full !max-w-[420px]',
  cardBox: 'w-full !max-w-[420px] shadow-none',
  card: 'w-full shadow-soft border border-border !bg-card',
  headerTitle: '!text-foreground font-display',
  headerSubtitle: '!text-muted-foreground',
  socialButtonsBlockButton:
    '!border-border !bg-card !text-foreground hover:!bg-muted shadow-soft',
  socialButtonsBlockButtonText: '!text-foreground font-medium',
  formFieldLabel: '!text-foreground',
  formFieldInput:
    '!bg-background !text-foreground !border-border focus:!ring-ring rounded-lg',
  formButtonPrimary:
    '!bg-primary !text-primary-foreground hover:!bg-primary/90 shadow-soft normal-case',
  footerActionLink: '!text-primary hover:!text-primary/80',
  identityPreviewText: '!text-foreground',
  identityPreviewEditButton: '!text-primary',
  dividerLine: '!bg-border',
  dividerText: '!text-muted-foreground',
  formFieldInputShowPasswordButton: '!text-muted-foreground',
  otpCodeFieldInput: '!border-border !text-foreground !bg-background',
  alternativeMethodsBlockButton: '!text-foreground !border-border',
  alertText: '!text-foreground',
  footer: '!bg-transparent',
  footerActionText: '!text-muted-foreground',
};

/**
 * Keeps Clerk's appearance in sync with next-themes.
 *
 * Clerk applies `appearance` updates in place, so this must never be keyed or
 * conditionally swapped — remounting the provider would unmount the whole app
 * tree and discard client state (e.g. in-progress form input).
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const appearance = React.useMemo(
    () => ({
      // Clerk v7: `theme` (legacy alias was `baseTheme`)
      theme: isDark ? dark : undefined,
      variables: isDark ? DARK_VARS : LIGHT_VARS,
      elements: clerkElements,
    }),
    [isDark],
  );

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>;
}
