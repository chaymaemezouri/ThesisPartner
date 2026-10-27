import { Avatar, Button, Select } from '@thesispartner/ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogout, useMeQuery } from '../../hooks/use-session';
import { portraitUrl } from '../supervision/temporary-portraits';
import { LOCALE_LABEL, LOCALES, type Locale } from '../../i18n/locales';
import { useLocale } from '../../i18n/LocaleContext';

export function SettingsPage() {
  const { locale, setLocale, t } = useLocale();
  const me = useMeQuery();
  const logout = useLogout();
  const [languageNotice, setLanguageNotice] = useState(false);
  const user = me.data?.user;

  return (
    <div className="min-w-0 space-y-4">
      <header className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('settings.subtitle')}</p>
      </header>

      <section
        className="rounded-md border border-line bg-surface px-4 py-4"
        aria-labelledby="account-title"
      >
        <h2 id="account-title" className="text-sm font-medium text-ink">
          {t('settings.account')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('settings.accountHelp')}</p>

        {me.isLoading ? (
          <p className="mt-4 text-sm text-muted">{t('common.loading')}</p>
        ) : user ? (
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <Avatar
              label={user.displayName}
              imageUrl={portraitUrl(user.displayName, user.avatarUrl)}
              size="md"
              decorative
            />
            <dl className="min-w-0 flex-1 space-y-3 text-sm">
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {t('settings.displayName')}
                </dt>
                <dd className="mt-0.5 font-medium text-ink">{user.displayName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {t('auth.email')}
                </dt>
                <dd className="mt-0.5 break-all text-ink">{user.email}</dd>
                <p className="mt-1 text-xs text-muted">
                  {user.emailVerified ? t('settings.emailVerified') : t('settings.emailUnverified')}
                </p>
              </div>
            </dl>
            <Link
              to="/profil"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-ink/20 hover:bg-canvas"
            >
              {t('settings.editProfile')}
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-danger" role="alert">
            {t('settings.accountLoadError')}
          </p>
        )}
      </section>

      <section
        className="rounded-md border border-line bg-surface px-4 py-4"
        aria-labelledby="language-title"
      >
        <h2 id="language-title" className="text-sm font-medium text-ink">
          {t('settings.language')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('settings.languageHelp')}</p>
        <div className="mt-4 max-w-sm">
          <Select
            id="settings-language"
            label={t('settings.language')}
            value={locale}
            onChange={(event) => {
              setLocale(event.target.value as Locale);
              setLanguageNotice(true);
            }}
          >
            {LOCALES.map((item) => (
              <option key={item} value={item}>
                {LOCALE_LABEL[item]}
              </option>
            ))}
          </Select>
        </div>
        {languageNotice ? (
          <p className="mt-3 text-sm text-ok" role="status">
            {t('settings.languageSaved')}
          </p>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-surface px-4 py-4">
        <h2 className="text-sm font-medium text-ink">{t('billing.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('billing.subtitle')}</p>
        <Link
          to="/abonnement"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:border-ink/20"
        >
          {t('nav.billing')}
        </Link>
      </section>

      <section
        className="rounded-md border border-line bg-surface px-4 py-4"
        aria-labelledby="invitations-access-title"
      >
        <h2 id="invitations-access-title" className="text-sm font-medium text-ink">
          {t('invitations.inboxTitle')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('invitations.inboxSubtitle')}</p>
        <Link
          to="/invitations"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:border-ink/20"
        >
          {t('invitations.inboxTitle')}
        </Link>
      </section>

      {user?.platformRole === 'SUPER_ADMIN' ? (
        <section
          className="rounded-md border border-line bg-surface px-4 py-4"
          aria-labelledby="admin-access-title"
        >
          <h2 id="admin-access-title" className="text-sm font-medium text-ink">
            {t('settings.adminAccess')}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('settings.adminAccessHelp')}</p>
          <Link
            to="/admin"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-brand bg-brand px-4 text-sm font-semibold text-white hover:border-brand-strong hover:bg-brand-strong"
          >
            {t('settings.openAdmin')}
          </Link>
        </section>
      ) : null}

      <section
        className="rounded-md border border-line bg-surface px-4 py-4"
        aria-labelledby="security-title"
      >
        <h2 id="security-title" className="text-sm font-medium text-ink">
          {t('settings.security')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('settings.securityHelp')}</p>

        <ul className="mt-4 divide-y divide-line">
          <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t('settings.password')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('settings.passwordHelp')}</p>
            </div>
            <Link
              to="/mot-de-passe-oublie"
              className="shrink-0 text-sm font-medium text-brand hover:underline"
            >
              {t('settings.resetPassword')}
            </Link>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{t('settings.session')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('settings.sessionHelp')}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {t('common.signOut')}
            </Button>
          </li>
        </ul>
      </section>
    </div>
  );
}
