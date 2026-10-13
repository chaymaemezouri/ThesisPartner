import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { DoctoralMeetingsPage } from './DoctoralMeetingsPage';

const thesisId = '22222222-2222-4222-8222-222222222222';

function dashboard() {
  return {
    profile: {
      givenName: 'Ada',
      familyName: 'Martin',
      displayName: 'Ada Martin',
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
    thesis: {
      id: thesisId,
      title: 'These A',
      status: 'ACTIVE',
      discipline: null,
      institution: null,
      startedOn: null,
      expectedDefenseOn: null,
      supervisors: [],
    },
    progress: { percentage: 0, status: 'NOT_STARTED' },
    workProgress: { percentage: 0 },
    profileCompletion: { percentage: 0, missingFields: [] },
    objectives: { total: 0, planned: 0, inProgress: 0, completed: 0, overdue: 0 },
    deliverables: {
      total: 0,
      draft: 0,
      submitted: 0,
      changesRequested: 0,
      validated: 0,
      overdue: 0,
    },
    kpis: [],
    upcomingDeadlines: [],
    recentActivity: [],
  };
}

function meeting(title: string, status: 'PLANNED' | 'HELD') {
  return {
    id: status === 'PLANNED' ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    thesisId,
    title,
    scheduledOn: status === 'PLANNED' ? '2026-11-02' : '2026-09-01',
    mode: 'ONLINE',
    status,
    location: null,
    meetingUrl: 'https://meet.example.test/session',
    agenda: null,
    minutes: status === 'HELD' ? 'Compte rendu.' : null,
    cancelReason: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function renderAt(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/reunions']}>
          <Routes>
            <Route path="/reunions" element={node} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('meetings page', () => {
  afterEach(() => cleanup());

  it('shows the subject in upcoming and keeps held meetings in history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) {
          return new Response(JSON.stringify(dashboard()), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            upcoming: [meeting('Point sur le chapitre 2', 'PLANNED')],
            history: [meeting('Relecture du protocole', 'HELD')],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }),
    );
    renderAt(<DoctoralMeetingsPage />);
    expect(await screen.findByRole('heading', { name: 'Meetings' })).toBeInTheDocument();
    expect(await screen.findByText('Point sur le chapitre 2')).toBeInTheDocument();
    expect(screen.getByText('Relecture du protocole')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request a meeting' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New meeting' })).not.toBeInTheDocument();
  });
});
