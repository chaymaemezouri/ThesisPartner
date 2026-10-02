import {
  ackSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from '@thesispartner/validation';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@thesispartner/ui';
import { apiSend } from '../../api/client';
import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';
import { useZodForm } from '../../forms/use-zod-form';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const t = useT();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useZodForm(passwordResetRequestSchema, { defaultValues: { email: '' } });

  return (
    <AuthLayout title={t('auth.forgotTitle')} intro={t('auth.forgotSubtitle')}>
      {done ? (
        <p className="text-sm leading-6 text-ink">{t('auth.forgotDone')}</p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            setMessage(null);
            try {
              await apiSend('/api/v1/auth/password-reset/request', ackSchema, values);
              setDone(true);
            } catch (error) {
              setMessage(formErrorMessage(error, t));
            }
          })}
        >
          <Input
            id="email"
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          {message ? (
            <p className="text-sm text-danger" role="alert">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('auth.sendLink')}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm">
        <Link className="text-brand" to="/connexion">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const t = useT();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useZodForm(passwordResetSchema, {
    defaultValues: { token: params.get('token') ?? '', password: '' },
  });

  return (
    <AuthLayout title={t('auth.resetTitle')} intro={t('auth.resetSubtitle')}>
      {done ? (
        <p className="text-sm leading-6 text-ink">
          {t('auth.resetDone')}{' '}
          <Link className="text-brand" to="/connexion">
            {t('auth.loginLink')}
          </Link>
        </p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            setMessage(null);
            try {
              await apiSend('/api/v1/auth/password-reset', ackSchema, values);
              setDone(true);
            } catch (error) {
              applyFieldErrors(error, form.setError);
              setMessage(formErrorMessage(error, t));
            }
          })}
        >
          <input type="hidden" {...form.register('token')} />
          <Input
            id="password"
            label={t('auth.newPassword')}
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          {message ? (
            <p className="text-sm text-danger" role="alert">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('auth.updatePassword')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
