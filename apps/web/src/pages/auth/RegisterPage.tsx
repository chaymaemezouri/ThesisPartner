import { currentUserResponseSchema, registerBodySchema } from '@thesispartner/validation';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@thesispartner/ui';
import { apiSend } from '../../api/client';
import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';
import { useZodForm } from '../../forms/use-zod-form';
import { useT } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';
import { authNavigation } from './auth-navigation';

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { email, next, loginUrl } = authNavigation(params);
  const queryClient = useQueryClient();
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const form = useZodForm(registerBodySchema, {
    defaultValues: {
      email,
      password: '',
      givenName: '',
      familyName: '',
      institution: '',
      masterStudent: false,
      projectTitle: '',
    },
  });
  const masterStudent = form.watch('masterStudent');

  return (
    <AuthLayout title={t('auth.registerTitle')} intro={t('auth.registerSubtitle')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setMessage(null);
          try {
            const body = await apiSend('/api/v1/auth/register', currentUserResponseSchema, values);
            queryClient.setQueryData(['me'], body);
            queryClient.removeQueries({ queryKey: ['supervision'] });
            if (!body.user.emailVerified) {
              await navigate(`/confirmation-email?next=${encodeURIComponent(next)}`);
              return;
            }
            await navigate(next);
          } catch (error) {
            applyFieldErrors(error, form.setError);
            setMessage(formErrorMessage(error, t));
          }
        })}
      >
        <Input
          id="givenName"
          label={t('auth.givenName')}
          autoComplete="given-name"
          error={form.formState.errors.givenName?.message}
          {...form.register('givenName')}
        />
        <Input
          id="familyName"
          label={t('auth.familyName')}
          autoComplete="family-name"
          error={form.formState.errors.familyName?.message}
          {...form.register('familyName')}
        />
        <Input
          id="email"
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Input
          id="institution"
          label={t('auth.institution')}
          hint={t('auth.optional')}
          autoComplete="organization"
          error={form.formState.errors.institution?.message}
          {...form.register('institution')}
        />
        <Input
          id="password"
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-line"
            checked={Boolean(masterStudent)}
            onChange={(event) => form.setValue('masterStudent', event.target.checked)}
          />
          <span>
            <span className="font-medium">{t('auth.masterStudent')}</span>
            <span className="mt-0.5 block text-xs text-muted">{t('auth.masterStudentHelp')}</span>
          </span>
        </label>
        {masterStudent ? (
          <Input
            id="projectTitle"
            label={t('auth.projectTitle')}
            error={form.formState.errors.projectTitle?.message}
            {...form.register('projectTitle')}
          />
        ) : null}
        {message ? (
          <p className="text-sm text-danger" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t('auth.createAccount')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {t('auth.hasAccount')}{' '}
        <Link className="text-brand" to={loginUrl}>
          {t('auth.loginLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
