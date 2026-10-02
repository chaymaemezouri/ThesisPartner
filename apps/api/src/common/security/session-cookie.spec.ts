import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session-cookie';

describe('sessionCookieOptions', () => {
  it('uses an httpOnly cookie and never a bearer token store', () => {
    const development = sessionCookieOptions({ NODE_ENV: 'development' });
    const production = sessionCookieOptions({ NODE_ENV: 'production' });

    expect(SESSION_COOKIE_NAME).toBe('tp_session');
    expect(development.httpOnly).toBe(true);
    expect(development.secure).toBe(false);
    expect(development.sameSite).toBe('lax');
    expect(production.secure).toBe(true);
  });
});
