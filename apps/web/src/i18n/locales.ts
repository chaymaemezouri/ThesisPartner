export const LOCALES = ['en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'tp_locale';

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};

export const LOCALE_TAG: Record<Locale, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'fr';
}
