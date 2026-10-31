import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvitationRespondPage } from '../../features/invitations/InvitationRespondPage';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const token = 'abcdefghijklmnopqrstuvwxyz0123456789ab';
const invitationPath = `/invitation?token=${token}`;
const email = 'supervisor@example.test';
const account = {
  user: {
    id: '33333333-3333-4333-8333-333333333333',
    email,
    emailVerified: false,
    platformRole: 'USER',
    givenName: 'Noa',
    familyName: 'Bernard',
    displayName: 'Noa Bernard',
    avatarUrl: null,
  },
};
const preview = {
  thesisTitle: 'Coastal ecosystems',
  role: 'SUPERVISOR',
  email,
  status: 'PENDING',
  replacesSupervisor: false,
  invitedByName: 'Ada Student',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderFlow(path = invitationPath, requiresAccount = true) {
  let authenticated = false;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/invitations/preview')) {
      return Response.json({ ...preview, requiresAccount: requiresAccount && !authenticated });
    }
    if (url.endsWith('/auth/register') || url.endsWith('/auth/login')) {
      authenticated = true;
      return Response.json(account);
    }
    if (url.endsWith('/auth/me')) {
      return authenticated
        ? Response.json(account)
        : Response.json(
            {
              statusCode: 401,
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
              errors: [],
              requestId: 'test',
            },
            { status: 401 },
          );
    }
    if (url.endsWith('/invitations/accept')) {
      return Response.json({
        ...preview,
        id: '44444444-4444-4444-8444-444444444444',
        thesisId: '22222222-2222-4222-8222-222222222222',
        status: 'ACCEPTED',
        emailStatus: 'SENT',
        changeReason: null,
        createdAt: '2026-10-31T12:00:00.000Z',
        respondedAt: '2026-10-31T12:01:00.000Z',
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Authentication must not reuse a previous account's supervision data.
  client.setQueryData(['supervision', 'theses'], { theses: [{ thesisId: 'previous-account' }] });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale="en">
        <MemoryRouter initialEntries={[path]}>
          <Location />
          <Routes>
            <Route path="/" element={<p>Home</p>} />
            <Route path="/invitation" element={<InvitationRespondPage />} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>,
  );
  return { fetchMock, client, user: userEvent.setup() };
}

afterEach(() => vi.unstubAllGlobals());

describe('invitation authentication flow', () => {
  it.each(['register', 'login'] as const)(
    'returns to the invitation after %s and requires explicit acceptance',
    async (mode) => {
      const { user, fetchMock, client } = renderFlow(invitationPath, mode === 'register');
      await user.click(
        await screen.findByRole('link', {
          name: mode === 'register' ? 'Create an account' : 'Sign in',
        }),
      );
      expect(screen.getByLabelText('Email')).toHaveValue(email);
      if (mode === 'register') {
        await user.type(screen.getByLabelText('First name'), 'Noa');
        await user.type(screen.getByLabelText('Last name'), 'Bernard');
      }
      await user.type(screen.getByLabelText('Password'), 'ThesisPartner2026!');
      await user.click(
        screen.getByRole('button', { name: mode === 'register' ? 'Create account' : 'Sign in' }),
      );
      const accept = await screen.findByRole('button', { name: 'Accept' });
      expect(screen.getByTestId('location')).toHaveTextContent(invitationPath);
      expect(client.getQueryData(['supervision', 'theses'])).toBeUndefined();
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).endsWith('/invitations/accept')),
      ).toBe(false);
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      await user.click(accept);
      expect(await screen.findByText('Home')).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/invitations/accept',
        expect.objectContaining({ body: JSON.stringify({ token }) }),
      );
    },
  );

  it('preserves the invitation and email when switching between sign in and registration', async () => {
    const { user } = renderFlow();
    await user.click(await screen.findByRole('link', { name: 'Create an account' }));
    await user.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(screen.getByLabelText('Email')).toHaveValue(email);
    await user.click(screen.getByRole('link', { name: 'Register' }));
    expect(screen.getByLabelText('Email')).toHaveValue(email);
    const current = new URL(
      screen.getByTestId('location').textContent!,
      'https://thesis-flow.invalid',
    );
    expect(current.searchParams.get('next')).toBe(invitationPath);
  });

  it.each(['/connexion', '/inscription', '/connexion?next=https%3A%2F%2Fexample.com'])(
    'returns ordinary authentication or an unsafe return URL to home: %s',
    async (path) => {
      const { user } = renderFlow(path);
      if (path.startsWith('/inscription')) {
        await user.type(screen.getByLabelText('First name'), 'Noa');
        await user.type(screen.getByLabelText('Last name'), 'Bernard');
      }
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Password'), 'ThesisPartner2026!');
      await user.click(
        screen.getByRole('button', {
          name: path.startsWith('/inscription') ? 'Create account' : 'Sign in',
        }),
      );
      await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    },
  );
});
