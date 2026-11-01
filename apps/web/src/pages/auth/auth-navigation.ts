import { emailSchema } from '@thesispartner/validation';

const AUTH_NEXT_KEY = 'tp_auth_next';

/** Keep authentication return paths inside the app, including after URL normalization. */
export function safeAuthDestination(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  try {
    const base = 'https://thesis-flow.invalid';
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith('//')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

/** Persist post-verification destination across the email-link round-trip (same browser). */
export function rememberAuthDestination(next: string): void {
  const safe = safeAuthDestination(next);
  try {
    if (safe === '/') sessionStorage.removeItem(AUTH_NEXT_KEY);
    else sessionStorage.setItem(AUTH_NEXT_KEY, safe);
  } catch {
    /* Ignore private-mode / storage failures. */
  }
}

export function consumeAuthDestination(fallback: string | null = null): string {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(AUTH_NEXT_KEY);
    sessionStorage.removeItem(AUTH_NEXT_KEY);
  } catch {
    stored = null;
  }
  return safeAuthDestination(fallback) !== '/'
    ? safeAuthDestination(fallback)
    : safeAuthDestination(stored);
}

export function authNavigation(params: URLSearchParams) {
  const parsedEmail = emailSchema.safeParse(params.get('email'));
  const email = parsedEmail.success ? parsedEmail.data : '';
  const next = safeAuthDestination(params.get('next'));
  const query = new URLSearchParams();
  if (email) query.set('email', email);
  if (next !== '/') query.set('next', next);
  const suffix = query.size ? `?${query.toString()}` : '';
  return { email, next, loginUrl: `/connexion${suffix}`, registerUrl: `/inscription${suffix}` };
}
