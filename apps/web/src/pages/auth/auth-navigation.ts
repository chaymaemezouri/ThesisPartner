import { emailSchema } from '@thesispartner/validation';

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
