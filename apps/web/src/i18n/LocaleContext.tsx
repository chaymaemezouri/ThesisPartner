import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, LOCALE_TAG, isLocale, type Locale } from './locales';
import { en } from './messages/en';
import { fr } from './messages/fr';
import { formatMessage, getMessage, type MessageKey } from './translate';

const catalogs = { en, fr } as const;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  dateLocale: string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const messages = catalogs[locale];
    return {
      locale,
      setLocale,
      dateLocale: LOCALE_TAG[locale],
      t: (key, params) => formatMessage(getMessage(messages, key), params),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}

export function useT() {
  return useLocale().t;
}
