import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
    supervisors: [{ displayName: 'Noa Bernard' }],
    meetings: [],
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
    const links = screen.getAllByRole('link', { name: 'View follow-up' });
    expect(links[0]).toHaveAttribute(
      'href',
      `/encadrement/${theses.theses[0]?.thesisId}`,
    );
    expect(links[1]).toHaveAttribute(
      'href',
      `/encadrement/${theses.theses[1]?.thesisId}`,
    );
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
