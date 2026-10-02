import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { DashboardView } from './DashboardView';

const profile = {
  givenName: 'Camille',
  familyName: 'Martin',
  displayName: 'Camille Martin',
  academicTitle: null,
  institution: 'Université de Lille',
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
};

function payload(thesis: unknown) {
  return {
    profile,
    thesis,
    progress: thesis
      ? { percentage: 60, status: 'ON_TRACK' }
      : { percentage: 0, status: 'NOT_STARTED' },
    workProgress: thesis ? { percentage: 60 } : { percentage: 0 },
    profileCompletion: {
      percentage: 43,
      missingFields: ['laboratory', 'specialty', 'avatarUrl', 'orcid'],
    },
    kpis: [
      { id: 'progress', value: thesis ? '60' : '0' },
      { id: 'profile', value: '43' },
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
    recentActivity: thesis
      ? [
          { type: 'THESIS_CREATED', occurredAt: '2026-09-28T12:00:00.000Z' },
          {
            type: 'DELIVERABLE_VERSION_CREATED',
            occurredAt: '2026-09-29T12:00:00.000Z',
            message: 'Nouvelle version V2 ajoutée à « Chapitre 2 — État de l’art »',
          },
        ]
      : [],
  };
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardView />
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('doctoral dashboard', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a skeleton while the overview is loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderDashboard();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('offers to create a thesis and shows no invented deadlines', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(payload(null))),
    );
    renderDashboard();
    expect(await screen.findByRole('link', { name: 'Create thesis' })).toBeInTheDocument();
    expect(screen.getByText('No deadlines planned yet.')).toBeInTheDocument();
    expect(screen.getByText('Université de Lille')).toBeInTheDocument();
  });

  it('renders the real thesis and progress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(
          payload({
            id: '22222222-2222-4222-8222-222222222222',
            title: 'Dynamique des ecosystemes cotiers',
            status: 'ACTIVE',
            discipline: 'Écologie',
            institution: null,
            startedOn: '2024-10-01',
            expectedDefenseOn: null,
            supervisors: [{ displayName: 'Noah Bernard' }],
          }),
        ),
      ),
    );
    renderDashboard();
    expect(await screen.findByRole('heading', { name: 'Hello, Camille' })).toBeInTheDocument();
    expect(screen.getAllByText('60 %').length).toBeGreaterThan(0);
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('Dynamique des ecosystemes cotiers')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).not.toBeInTheDocument();
    expect(screen.getByText('No deadlines planned yet.')).toBeInTheDocument();
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
