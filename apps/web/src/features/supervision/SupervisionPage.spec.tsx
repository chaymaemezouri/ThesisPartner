import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { SupervisionPage } from './SupervisionPage';

const theses = {
  theses: [
    student('11111111-1111-4111-8111-111111111111', 'Ada', 'These Alpha'),
    student('22222222-2222-4222-8222-222222222222', 'Bea', 'These Beta'),
  ],
};

function student(thesisId: string, givenName: string, title: string) {
  const person = {
    id: `33333333-3333-4333-8333-${thesisId.slice(-12)}`,
    givenName,
    familyName: 'Test',
    avatarUrl: null,
    institution: 'Université de Lille',
    specialty: 'Histoire',
  };
  return {
    thesisId,
    title,
    status: 'ACTIVE',
    discipline: 'Histoire',
    institution: 'Université de Lille',
    startedOn: '2021-10-01',
    expectedDefenseOn: '2026-10-01',
    durationYears: 5,
    progressPercentage: 0,
    deliverableCount: 0,
    pendingValidationCount: 0,
    pendingDeliverables: [],
    supervisors: [{ displayName: 'Noa Bernard' }],
    meetings: [],
    coverage: { writable: true, source: 'subscription' as const, expiresAt: null },
    doctoralStudent: person,
    doctoralStudents: [person],
    objectiveSummary: { total: 0, inProgress: 0, completed: 0, overdue: 0 },
  };
}

function renderPage(initialPath = '/encadrement') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/encadrement" element={<SupervisionPage />} />
            <Route path="/" element={<p>Home</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('supervised theses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a skeleton while loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('redirects home when there are no supervised theses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ theses: [] })),
    );
    renderPage();
    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('lists every supervised thesis and links to that thesis', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(theses)),
    );
    renderPage();
    expect(await screen.findByText('Ada Test')).toBeInTheDocument();
    expect(screen.getByText('Bea Test')).toBeInTheDocument();
    expect(screen.getByText('These Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Doctoral students')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ada Test/ })).toHaveAttribute(
      'href',
      `/encadrement/${theses.theses[0]?.thesisId}`,
    );
    expect(screen.getByRole('link', { name: /Bea Test/ })).toHaveAttribute(
      'href',
      `/encadrement/${theses.theses[1]?.thesisId}`,
    );
  });

  it('splits doctoral and Master students into tabs', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          theses: [
            student('11111111-1111-4111-8111-111111111111', 'Ada', 'These Alpha'),
            {
              ...student('22222222-2222-4222-8222-222222222222', 'Lina', 'Projet Master'),
              track: 'MASTER',
            },
          ],
        }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('tab', { name: /Master students/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Doctoral students/ })).toBeInTheDocument();
    expect(screen.getByText('Ada Test')).toBeInTheDocument();
    expect(screen.queryByText('Lina Test')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Master students/ }));
    expect(await screen.findByText('Lina Test')).toBeInTheDocument();
    expect(screen.queryByText('Ada Test')).not.toBeInTheDocument();
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
