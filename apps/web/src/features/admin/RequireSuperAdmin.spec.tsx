import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { RequireSuperAdmin } from './RequireSuperAdmin';

const meUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.test',
  emailVerified: true,
  platformRole: 'SUPER_ADMIN' as const,
  givenName: 'Ada',
  familyName: 'Admin',
  displayName: 'Ada Admin',
  avatarUrl: null,
};

describe('RequireSuperAdmin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders admin routes for SUPER_ADMIN', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ user: meUser }, { status: 200 })),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Admin home')).toBeInTheDocument());
  });

  it('redirects non-admins to the workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { user: { ...meUser, platformRole: 'USER', email: 'user@example.test' } },
          { status: 200 },
        ),
      ),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Workspace')).toBeInTheDocument());
    expect(screen.queryByText('Admin home')).not.toBeInTheDocument();
  });
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale="en">
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/" element={<p>Workspace</p>} />
            <Route element={<RequireSuperAdmin />}>
              <Route path="/admin" element={<p>Admin home</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}
