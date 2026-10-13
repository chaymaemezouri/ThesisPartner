import { Select } from '@thesispartner/ui';
import { useState } from 'react';
import { LOCALE_LABEL, LOCALES, type Locale } from '../../i18n/locales';
import { useLocale } from '../../i18n/LocaleContext';

export function SettingsPage() {
  const { locale, setLocale, t } = useLocale();
  const [notice, setNotice] = useState(false);

  return (
    <div className="min-w-0 max-w-xl">
      <h1 className="sr-only">{t('settings.title')}</h1>
      <section className="rounded-md border border-line bg-surface px-4 py-4" aria-labelledby="language-title">
        <h2 id="language-title" className="text-sm font-medium text-ink">
          {t('settings.language')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('settings.languageHelp')}</p>
        <div className="mt-4 max-w-xs">
          <Select
            id="settings-language"
            label={t('settings.language')}
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value as Locale);
              setNotice(true);
            }}
          >
            {LOCALES.map((item) => (
              <option key={item} value={item}>
                {LOCALE_LABEL[item]}
              </option>
            ))}
          </Select>
        </div>
        {notice ? (
          <p className="mt-3 text-sm text-ok" role="status">
            {t('settings.languageSaved')}
          </p>
        ) : null}
      </section>
    </div>
  );
}
