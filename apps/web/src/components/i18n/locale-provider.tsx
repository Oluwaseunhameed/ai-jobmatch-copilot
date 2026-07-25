'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale, Messages } from '@jobmatch/i18n';
import { getMessages, isLocale } from '@jobmatch/i18n';

interface LocaleContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale = 'en',
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : 'en',
  );
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    void getMessages(locale).then(setMessages);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      messages: messages ?? ({} as Messages),
      setLocale,
    }),
    [locale, messages, setLocale],
  );

  if (!messages) return null;

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useT() {
  return useLocale().messages;
}
