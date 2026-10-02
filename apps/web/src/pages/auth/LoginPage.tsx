import { currentUserResponseSchema, loginBodySchema } from '@thesispartner/validation';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@thesispartner/ui';
import { useQueryClient } from '@tanstack/react-query';
import { apiSend } from '../../api/client';
import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';
import { useZodForm } from '../../forms/use-zod-form';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const form = useZodForm(loginBodySchema, {
    defaultValues: { email: '', password: '' },
  });

  return (
    <AuthLayout title={t('auth.loginTitle')} intro={t('auth.loginSubtitle')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setMessage(null);
          try {
            const body = await apiSend('/api/v1/auth/login', currentUserResponseSchema, values);
            queryClient.setQueryData(['me'], body);
            await navigate('/');
          } catch (error) {
            applyFieldErrors(error, form.setError);
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
        <Input
          id="password"
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        {message ? (
          <p className="text-sm text-danger" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t('auth.signIn')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        <Link className="text-brand" to="/mot-de-passe-oublie">
          {t('auth.forgotPassword')}
        </Link>
      </p>
      <p className="mt-2 text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link className="text-brand" to="/inscription">
          {t('auth.registerLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
