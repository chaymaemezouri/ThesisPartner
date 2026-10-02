import { SESSION_COOKIE_NAME } from '@thesispartner/types';
import type { Env } from '../../config/env';

export { SESSION_COOKIE_NAME };

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(env: Pick<Env, 'NODE_ENV'>) {
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: FOURTEEN_DAYS_MS,
  };
}
