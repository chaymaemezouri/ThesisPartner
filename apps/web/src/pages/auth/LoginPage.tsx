import { currentUserResponseSchema, loginBodySchema } from '@thesispartner/validation';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiSend } from '../../api/client';
import { BrandLogo } from '../../components/BrandLogo';
import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';
import { useZodForm } from '../../forms/use-zod-form';
import { useT } from '../../i18n/LocaleContext';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useZodForm(loginBodySchema, {
    defaultValues: { email: '', password: '' },
  });

  return (
    <main className="min-h-screen bg-[#e7eef8] p-3 sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1180px] overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_70px_rgba(30,64,175,0.14)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#3b82f6_0%,#1d4ed8_42%,#1e3a8a_100%)] px-10 py-10 text-white lg:flex lg:flex-col">
          <BrandMark light />
          <h1 className="mt-10 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            {t('auth.loginHeroTitle')}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">{t('auth.loginHeroText')}</p>
          <ul className="mt-8 grid max-w-sm gap-4">
            <Feature
              icon="target"
              title={t('auth.loginFeatureObjectives')}
              text={t('auth.loginFeatureObjectivesText')}
            />
            <Feature
              icon="file"
              title={t('auth.loginFeatureDeliverables')}
              text={t('auth.loginFeatureDeliverablesText')}
            />
            <Feature
              icon="chart"
              title={t('auth.loginFeatureProgress')}
              text={t('auth.loginFeatureProgressText')}
            />
          </ul>
          <p className="mt-auto pt-8 text-[11px] tracking-[0.22em] text-white/70 uppercase">
            {t('auth.loginMark')}
            <span className="mt-1 block">{t('auth.loginMarkLine')}</span>
          </p>
          <HeroScene />
        </section>
        <section className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[22rem]">
            <BrandMark />
            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-ink">
              {t('auth.loginTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted">{t('auth.loginSubtitle')}</p>
            <form
              className="mt-8 flex flex-col gap-4"
              onSubmit={form.handleSubmit(async (values) => {
                setMessage(null);
                try {
                  const body = await apiSend(
                    '/api/v1/auth/login',
                    currentUserResponseSchema,
                    values,
                  );
                  queryClient.setQueryData(['me'], body);
                  await navigate('/');
                } catch (error) {
                  applyFieldErrors(error, form.setError);
                  setMessage(formErrorMessage(error, t));
                }
              })}
            >
              <Field
                id="email"
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                icon="mail"
                error={form.formState.errors.email?.message}
                {...form.register('email')}
              />
              <Field
                id="password"
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                icon="lock"
                error={form.formState.errors.password?.message}
                trailing={
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-white hover:text-ink"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <Glyph name={showPassword ? 'eyeOff' : 'eye'} />
                  </button>
                }
                {...form.register('password')}
              />
              {message ? (
                <p className="text-sm text-danger" role="alert">
                  {message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="mt-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(36,87,167,0.28)] transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('auth.signIn')}
              </button>
            </form>
            <p className="mt-5 text-sm text-muted">
              <Link className="hover:text-brand" to="/mot-de-passe-oublie">
                {t('auth.forgotPassword')}
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted">
              {t('auth.noAccount')}{' '}
              <Link className="font-medium text-brand" to="/inscription">
                {t('auth.registerLink')}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={light ? 'rounded-xl bg-white p-1' : undefined}>
        <BrandLogo />
      </span>
      <span
        className={`text-base font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
      >
        ThesisPartner
      </span>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: 'target' | 'file' | 'chart';
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
        <Glyph name={icon} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-white/75">{text}</span>
      </span>
    </li>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    icon: 'mail' | 'lock';
    error?: string;
    trailing?: ReactNode;
  }
>(function Field({ id, label, icon, error, trailing, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
          <Glyph name={icon} />
        </span>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-[#f3f6fb] py-3 pr-3 pl-10 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:bg-white focus:shadow-[0_0_0_3px_rgba(36,87,167,0.12)] ${
            error ? 'border-danger' : 'border-transparent'
          } ${trailing ? 'pr-12' : ''}`}
          {...props}
        />
        {trailing ? (
          <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

function HeroScene() {
  return (
    <svg
      viewBox="0 0 420 220"
      className="pointer-events-none absolute right-0 bottom-0 h-52 w-[24rem]"
      aria-hidden="true"
    >
      <rect x="250" y="120" width="150" height="90" rx="10" fill="#dbe7ff" />
      <rect x="262" y="78" width="126" height="78" rx="8" fill="#eff5ff" />
      <rect x="40" y="150" width="92" height="16" rx="3" fill="#93c5fd" />
      <rect x="48" y="134" width="84" height="16" rx="3" fill="#bfdbfe" />
      <rect x="56" y="118" width="76" height="16" rx="3" fill="#ffffff" opacity="0.9" />
      <g fill="none" stroke="#dbeafe" strokeWidth="6">
        <path d="M150 150c40-50 80-20 130-70" />
      </g>
      <g>
        <rect
          x="168"
          y="36"
          width="78"
          height="54"
          rx="10"
          fill="rgba(255,255,255,0.18)"
          stroke="rgba(255,255,255,0.45)"
        />
        <rect x="180" y="48" width="28" height="4" rx="2" fill="white" />
        <rect x="180" y="58" width="42" height="4" rx="2" fill="white" opacity="0.7" />
        <rect x="180" y="68" width="34" height="4" rx="2" fill="white" opacity="0.5" />
      </g>
      <g>
        <rect
          x="250"
          y="18"
          width="72"
          height="50"
          rx="10"
          fill="rgba(255,255,255,0.16)"
          stroke="rgba(255,255,255,0.4)"
        />
        <path
          d="M266 48v-14M274 48v-20M282 48v-8M290 48v-16"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function Glyph({
  name,
}: {
  name: 'mail' | 'lock' | 'eye' | 'eyeOff' | 'target' | 'file' | 'chart';
}) {
  const paths: Record<typeof name, string> = {
    mail: 'M4 6h16v12H4zM4 6l8 7 8-7',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
    eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'M4 5l16 14M9.5 9.5A8 8 0 0 0 4 12s4 6 8 6a7 7 0 0 0 3.5-.8M14 14.2A3 3 0 0 1 9.8 10',
    target:
      'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    file: 'M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h6',
    chart: 'M5 19V9M12 19V5M19 19v-7',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
