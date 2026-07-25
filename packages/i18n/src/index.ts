export type Locale = 'en' | 'es' | 'fr' | 'de';

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

type Stringify<T> = {
  [K in keyof T]: T[K] extends object ? Stringify<T[K]> : string;
};

export type Messages = Stringify<typeof import('./messages/en').default>;

const catalogs: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('./messages/en') as Promise<{ default: Messages }>,
  es: () => import('./messages/es') as Promise<{ default: Messages }>,
  fr: () => import('./messages/fr') as Promise<{ default: Messages }>,
  de: () => import('./messages/de') as Promise<{ default: Messages }>,
};

export async function getMessages(locale: Locale): Promise<Messages> {
  const mod = await catalogs[locale]?.() ?? catalogs.en();
  return mod.default;
}

export function isLocale(value: string): value is Locale {
  return ['en', 'es', 'fr', 'de'].includes(value);
}
