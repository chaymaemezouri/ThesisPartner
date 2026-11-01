import { ackSchema, emailVerificationBodySchema } from '@thesispartner/validation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiSend } from '../../api/client';
import { formErrorMessage } from '../../forms/api-errors';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';
import { authNavigation, consumeAuthDestination } from './auth-navigation';

export function VerifyEmailPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMeQuery();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nextRef = useRef<string | null>(null);
  if (nextRef.current === null) {
    nextRef.current = consumeAuthDestination(params.get('next'));
  }
  const next = nextRef.current;
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);
  const { loginUrl } = authNavigation(params);

  useEffect(() => {
    const parsed = emailVerificationBodySchema.safeParse({ token });
    if (!parsed.success) {
      setState('error');
      setMessage(t('auth.verifyIncomplete'));
      return;
    }
    let active = true;
    apiSend('/api/v1/auth/email-verification', ackSchema, parsed.data)
      .then(async () => {
        if (!active) return;
        setState('ok');
        await queryClient.invalidateQueries({ queryKey: ['me'] });
        await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState('error');
        setMessage(formErrorMessage(error, t));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the token changes
  }, [token]);

  useEffect(() => {
    if (state !== 'ok') return;
    if (me.data?.user.emailVerified) {
      const timer = window.setTimeout(() => {
        void navigate(next);
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [state, me.data?.user.emailVerified, navigate, next]);

  return (
    <AuthLayout title={t('auth.verifyTitle')} intro={t('auth.verifySubtitle')}>
      {state === 'pending' ? <p className="text-sm text-muted">{t('auth.verifyPending')}</p> : null}
      {state === 'ok' ? (
        <div className="space-y-3 text-sm text-ink">
          <p>{t('auth.verifySuccess')}</p>
          {me.data?.user ? (
            <p className="text-muted">{t('auth.verifyRedirecting')}</p>
          ) : (
            <p>
              <Link className="font-medium text-brand" to={loginUrl}>
                {t('auth.loginLink')}
              </Link>
            </p>
          )}
          <Link className="text-brand" to={next}>
            {t('auth.backToWorkspace')}
          </Link>
        </div>
      ) : null}
      {state === 'error' ? (
        <div className="space-y-3 text-sm" role="alert">
          <p className="text-danger">{message}</p>
          <p className="text-muted">{t('auth.verifyExpiredHelp')}</p>
          <div className="flex flex-wrap gap-3">
            <Link className="font-medium text-brand" to="/confirmation-email">
              {t('auth.resendVerification')}
            </Link>
            <Link className="font-medium text-brand" to={loginUrl}>
              {t('auth.loginLink')}
            </Link>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}
