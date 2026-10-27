import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { AppRoutes } from '../routes/router';

function renderShell(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('application shell', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me')) {
          return new Response(
            JSON.stringify({
              user: {
                id: '11111111-1111-4111-8111-111111111111',
                email: 'camille.martin@example.edu',
                emailVerified: true,
                platformRole: 'USER',
                givenName: 'Camille',
                familyName: 'Martin',
                displayName: 'Camille Martin',
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (url.includes('/dashboard')) {
          return new Response(
            JSON.stringify({
              profile: {
                givenName: 'Camille',
                familyName: 'Martin',
                displayName: 'Camille Martin',
                academicTitle: null,
                institution: null,
                laboratory: null,
                doctoralSchool: null,
                specialty: null,
                city: null,
                country: null,
                orcid: null,
                avatarUrl: null,
                cvUrl: null,
                googleScholarUrl: null,
                linkedinUrl: null,
              },
              thesis: null,
              progress: { percentage: 0, status: 'NOT_STARTED' },
              workProgress: { percentage: 0 },
              profileCompletion: { percentage: 29, missingFields: ['institution'] },
              kpis: [
                { id: 'progress', value: '0' },
                { id: 'profile', value: '29' },
              ],
              objectives: { total: 0, planned: 0, inProgress: 0, completed: 0, overdue: 0 },
              deliverables: {
                total: 0,
                draft: 0,
                submitted: 0,
                changesRequested: 0,
                validated: 0,
                overdue: 0,
              },
              upcomingDeadlines: [],
              recentActivity: [],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (url.includes('/supervision/theses')) {
          return new Response(JSON.stringify({ theses: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            status: 'ok',
            checks: { api: 'ok', database: 'ok', redis: 'ok', storage: 'ok' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the dashboard and navigates to a module', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(await screen.findByRole('heading', { name: 'Hello, Camille' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Supervision' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My students' })).not.toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    await user.click(within(navigation).getByRole('link', { name: 'Objectives' }));

    expect(screen.getByRole('heading', { name: 'Objectives' })).toBeInTheDocument();
    expect(screen.getByText('No associated thesis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New objective' })).not.toBeInTheDocument();
  });

  it('opens the mobile menu and reaches Portfolio', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Menu' });
    await user.click(within(dialog).getByRole('link', { name: 'Portfolio' }));

    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
  });
});
