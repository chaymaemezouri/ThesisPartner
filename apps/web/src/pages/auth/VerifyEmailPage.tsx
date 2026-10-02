import { ackSchema, emailVerificationBodySchema } from '@thesispartner/validation';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiSend } from '../../api/client';
import { formErrorMessage } from '../../forms/api-errors';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';

export function VerifyEmailPage() {
  const t = useT();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsed = emailVerificationBodySchema.safeParse({ token });
    if (!parsed.success) {
      setState('error');
      setMessage(t('auth.verifyIncomplete'));
      return;
    }
    let active = true;
    apiSend('/api/v1/auth/email-verification', ackSchema, parsed.data)
      .then(() => {
        if (active) setState('ok');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState('error');
        setMessage(formErrorMessage(error, t));
      });
    return () => {
      active = false;
    };
    // Re-verify only when the token changes, not when the locale updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable enough for the incomplete-link message
  }, [token]);

  return (
    <AuthLayout title={t('auth.verifyTitle')} intro={t('auth.verifySubtitle')}>
      {state === 'pending' ? <p className="text-sm text-muted">{t('auth.verifyPending')}</p> : null}
      {state === 'ok' ? (
        <p className="text-sm text-ink">
          {t('auth.verifySuccess')}{' '}
          <Link className="text-brand" to="/">
            {t('auth.backToWorkspace')}
          </Link>
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="text-sm text-danger" role="alert">
          {message}{' '}
          <Link className="text-brand" to="/connexion">
            {t('auth.loginLink')}
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}
