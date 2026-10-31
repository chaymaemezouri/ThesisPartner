import { describe, expect, it } from 'vitest';
import { authNavigation, safeAuthDestination } from './auth-navigation';

describe('authentication return destination', () => {
  it.each([
    null,
    '',
    'https://example.com/invitation',
    '//example.com/invitation',
    '/\\example.com/invitation',
    'javascript:alert(1)',
    '/\n/example.com',
    '/..//example.com',
    '/%2e%2e//example.com',
  ])('falls back to home for an unsafe destination: %s', (value) => {
    expect(safeAuthDestination(value)).toBe('/');
  });

  it('preserves the complete invitation path', () => {
    expect(safeAuthDestination('/invitation?token=a%2Bb#details')).toBe(
      '/invitation?token=a%2Bb#details',
    );
  });

  it('carries a validated email and return path between authentication pages', () => {
    const navigation = authNavigation(
      new URLSearchParams({ email: ' Supervisor@example.test ', next: '/invitation?token=abc' }),
    );
    expect(navigation.email).toBe('supervisor@example.test');
    for (const path of [navigation.loginUrl, navigation.registerUrl]) {
      const url = new URL(path, 'https://thesis-flow.invalid');
      expect(url.searchParams.get('email')).toBe('supervisor@example.test');
      expect(url.searchParams.get('next')).toBe('/invitation?token=abc');
    }
  });

  it('discards invalid email and external destinations from authentication links', () => {
    expect(
      authNavigation(new URLSearchParams({ email: 'invalid', next: '//example.com' })),
    ).toEqual({ email: '', next: '/', loginUrl: '/connexion', registerUrl: '/inscription' });
  });
});
