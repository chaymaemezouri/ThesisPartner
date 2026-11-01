import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { RequireEmailVerified } from './RequireEmailVerified';

const verified = {
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

const unverified = {
  ...verified,
  user: { ...verified.user, emailVerified: false },
};

function renderGate(path: string, account: typeof verified) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(account), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<RequireEmailVerified />}>
              <Route path="/" element={<p>Dashboard</p>} />
              <Route path="/confirmation-email" element={<p>Confirm email</p>} />
              <Route path="/parametres" element={<p>Settings</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('RequireEmailVerified', () => {
  it('lets verified users into the workspace', async () => {
    renderGate('/', verified);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects unverified users away from protected routes', async () => {
    renderGate('/', unverified);
    expect(await screen.findByText('Confirm email')).toBeInTheDocument();
  });

  it('blocks settings until the email is verified', async () => {
    renderGate('/parametres', unverified);
    expect(await screen.findByText('Confirm email')).toBeInTheDocument();
  });
});
