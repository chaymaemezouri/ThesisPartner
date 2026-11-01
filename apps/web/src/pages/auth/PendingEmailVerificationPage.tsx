import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useLogout, useMeQuery, useRequestEmailVerification } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';
import { authNavigation, rememberAuthDestination, safeAuthDestination } from './auth-navigation';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function PendingEmailVerificationPage() {
  const t = useT();
  const [params] = useSearchParams();
  const next = safeAuthDestination(params.get('next'));
  const me = useMeQuery();
  const resend = useRequestEmailVerification();
  const logout = useLogout();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    rememberAuthDestination(next);
  }, [next]);

  if (me.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </main>
    );
  }

  if (me.isError || !me.data?.user) {
    const { loginUrl } = authNavigation(params);
    return <Navigate to={loginUrl} replace />;
  }

  if (me.data.user.emailVerified) {
    return <Navigate to={next} replace />;
  }

  const email = me.data.user.email;

  return (
    <AuthLayout title={t('auth.pendingVerifyTitle')} intro={t('auth.pendingVerifySubtitle')}>
      <div className="space-y-4">
        <p className="text-sm text-ink">{t('auth.pendingVerifyBody')}</p>
        <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink">
          {maskEmail(email)}
        </p>
        <p className="text-sm text-muted">{t('auth.pendingVerifyHelp')}</p>
        {message ? (
          <p className={`text-sm ${ok ? 'text-ok' : 'text-danger'}`} role="status">
            {message}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={resend.isPending}
          onClick={() => {
            setMessage(null);
            setOk(false);
            void resend
              .mutateAsync()
              .then(() => {
                setOk(true);
                setMessage(t('auth.resendVerificationSent'));
              })
              .catch((error: unknown) => {
                setOk(false);
                setMessage(
                  error instanceof ApiClientError
                    ? error.body.message
                    : t('auth.resendVerificationFailed'),
                );
              });
          }}
        >
          {t('auth.resendVerification')}
        </Button>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className="font-medium text-brand hover:underline"
            onClick={() => void me.refetch()}
          >
            {t('auth.refreshVerification')}
          </button>
          <button
            type="button"
            className="font-medium text-muted hover:underline"
            disabled={logout.isPending}
            onClick={() => void logout.mutateAsync()}
          >
            {t('common.signOut')}
          </button>
        </div>
        <p className="text-xs text-muted">
          {t('auth.pendingVerifyWrongEmail')}{' '}
          <Link className="text-brand hover:underline" to="/connexion">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
