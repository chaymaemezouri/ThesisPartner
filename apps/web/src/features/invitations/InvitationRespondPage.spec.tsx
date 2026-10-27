import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { InvitationRespondPage } from './InvitationRespondPage';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ab';

const previewPending = {
  thesisTitle: 'Coastal ecosystems',
  role: 'SUPERVISOR' as const,
  email: 'supervisor@example.test',
  status: 'PENDING' as const,
  replacesSupervisor: false,
  invitedByName: 'Ada Student',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  requiresAccount: false,
};

const meInvitee = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'supervisor@example.test',
  emailVerified: true,
  platformRole: 'USER' as const,
  givenName: 'Noa',
  familyName: 'Bernard',
  displayName: 'Noa Bernard',
  avatarUrl: null,
};

describe('InvitationRespondPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows an invalid state when the token is missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    renderPage('/invitation');
    expect(await screen.findByRole('heading', { name: 'Invalid invitation' })).toBeInTheDocument();
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
  });

  it('shows login prompt when preview requires an authenticated invitee', async () => {
    stubFetch({
      preview: previewPending,
      meStatus: 401,
    });
    renderPage(`/invitation?token=${TOKEN}`);
    await waitFor(() =>
      expect(screen.getByText(/Sign in with supervisor@example.test/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('Coastal ecosystems')).toBeInTheDocument();
  });

  it('blocks accept when the signed-in email does not match the invite', async () => {
    stubFetch({
      preview: previewPending,
      me: { ...meInvitee, email: 'other@example.test' },
    });
    renderPage(`/invitation?token=${TOKEN}`);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/other@example.test/i));
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('sends accept when the invitee is signed in with the matching email', async () => {
    const fetchMock = stubFetch({
      preview: previewPending,
      me: meInvitee,
    });
    renderPage(`/invitation?token=${TOKEN}`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/invitations/accept'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
  });

  it('sends reject when the invitee declines', async () => {
    const fetchMock = stubFetch({
      preview: previewPending,
      me: meInvitee,
    });
    renderPage(`/invitation?token=${TOKEN}`);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/invitations/reject'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(screen.getByText('Inbox')).toBeInTheDocument());
  });

  it('surfaces an expired or invalid invitation from the preview API', async () => {
    stubFetch({
      previewError: {
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'This invitation has expired',
        errors: [],
        requestId: 'test',
      },
      meStatus: 401,
    });
    renderPage(`/invitation?token=${TOKEN}`);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/This invitation has expired/i),
    );
  });
});

function stubFetch(options: {
  preview?: typeof previewPending;
  previewError?: {
    statusCode: number;
    code: string;
    message: string;
    errors: unknown[];
    requestId: string;
  };
  me?: typeof meInvitee;
  meStatus?: number;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/invitations/preview')) {
      if (options.previewError) {
        return Response.json(options.previewError, { status: options.previewError.statusCode });
      }
      return Response.json(options.preview ?? previewPending);
    }
    if (url.includes('/auth/me')) {
      if (options.meStatus === 401 || !options.me) {
        return Response.json(
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
      return Response.json({ user: options.me });
    }
    if (url.includes('/invitations/accept') || url.includes('/invitations/reject')) {
      return Response.json({
        id: '44444444-4444-4444-8444-444444444444',
        thesisId: '22222222-2222-4222-8222-222222222222',
        thesisTitle: 'Coastal ecosystems',
        email: 'supervisor@example.test',
        role: 'SUPERVISOR',
        status: url.includes('accept') ? 'ACCEPTED' : 'REJECTED',
        emailStatus: 'SENT',
        replacesSupervisor: false,
        changeReason: null,
        invitedByName: 'Ada Student',
        expiresAt: previewPending.expiresAt,
        createdAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
      });
    }
    return Response.json({ ok: true }, { status: init?.method === 'POST' ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(path: string) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <LocaleProvider initialLocale="en">
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<p>Home</p>} />
            <Route path="/invitations" element={<p>Inbox</p>} />
            <Route path="/invitation" element={<InvitationRespondPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}
