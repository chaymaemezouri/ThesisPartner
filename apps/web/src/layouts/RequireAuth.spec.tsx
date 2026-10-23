import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { RequireAuth } from './RequireAuth';

const account = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'demo@example.test',
    emailVerified: true,
    platformRole: 'USER',
    givenName: 'Nora',
    familyName: 'Bernard',
    displayName: 'Nora Bernard',
  },
};
const response = (status: number) =>
  new Response(
    JSON.stringify(
      status === 200
        ? account
        : {
            statusCode: status,
            code: status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
            message: 'Unavailable',
            errors: [],
            requestId: 'auth-recovery-test',
          },
    ),
    { status, headers: { 'content-type': 'application/json' } },
  );

function renderProtectedPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/suivi']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/suivi" element={<p>Protected workspace</p>} />
            </Route>
            <Route path="/connexion" element={<p>Sign in required</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('session recovery', () => {
  it('automatically recovers from a temporary API failure', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetch);
    renderProtectedPage();
    expect(
      await screen.findByText('Protected workspace', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers an explicit retry after a lasting failure', async () => {
    const fetch = vi.fn(async () => response(503));
    vi.stubGlobal('fetch', fetch);
    renderProtectedPage();
    const retry = await screen.findByRole('button', { name: 'Try again' }, { timeout: 5000 });
    fetch.mockImplementation(async () => response(200));
    await userEvent.setup().click(retry);
    expect(await screen.findByText('Protected workspace')).toBeInTheDocument();
  }, 10000);

  it('redirects an expired session to sign in without retrying', async () => {
    const fetch = vi.fn(async () => response(401));
    vi.stubGlobal('fetch', fetch);
    renderProtectedPage();
    expect(await screen.findByText('Sign in required')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
