import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { DoctoralObjectiveDetailPage, DoctoralObjectivesPage } from './DoctoralObjectivesPage';
import {
  SupervisorObjectiveDetailPage,
  SupervisorObjectivesPage,
} from './SupervisorObjectivesPage';

const thesisId = '22222222-2222-4222-8222-222222222222';
const objectiveId = '33333333-3333-4333-8333-333333333333';

const objective = {
  id: objectiveId,
  thesisId,
  title: 'Etat de l art',
  description: 'Methodologie',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  startDate: null,
  dueDate: '2026-09-28',
  completedAt: null,
  progress: 70,
  progressMode: 'MANUAL',
  taskSummary: { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 },
  completionReview: {
    status: 'NOT_REQUESTED',
    requestedAt: null,
    validatedAt: null,
    message: null,
    validatedByName: null,
  },
  isOverdue: true,
  responsible: {
    id: '44444444-4444-4444-8444-444444444444',
    givenName: 'Ada',
    familyName: 'Test',
    displayName: 'Ada Test',
  },
  origin: 'SUPERVISOR',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

function dashboard(thesis: boolean) {
  return {
    profile: {
      givenName: 'Ada',
      familyName: 'Test',
      displayName: 'Ada Test',
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
    thesis: thesis
      ? {
          id: thesisId,
          title: 'These A',
          status: 'ACTIVE',
          discipline: null,
          institution: null,
          startedOn: null,
          expectedDefenseOn: null,
          supervisors: [],
        }
      : null,
    progress: { percentage: 0, status: 'NOT_STARTED' },
    workProgress: { percentage: 0 },
    profileCompletion: { percentage: 0, missingFields: [] },
    objectives: {
      total: thesis ? 1 : 0,
      planned: 0,
      inProgress: thesis ? 1 : 0,
      completed: 0,
      overdue: thesis ? 1 : 0,
    },
    deliverables: {
      total: 0,
      draft: 0,
      submitted: 0,
      changesRequested: 0,
      validated: 0,
      overdue: 0,
    },
    kpis: [{ id: 'progress', value: '0' }],
    upcomingDeadlines: [],
    recentActivity: [],
  };
}

function renderAt(path: string, node: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/objectifs" element={node} />
            <Route path="/objectifs/:objectiveId" element={node} />
            <Route path="/encadrement/:thesisId/objectifs" element={node} />
            <Route path="/encadrement/:thesisId/objectifs/:objectiveId" element={node} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('doctoral objectives', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a skeleton while loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderAt('/objectifs', <DoctoralObjectivesPage />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('offers the thesis page when the student has no thesis and hides creation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(dashboard(false))),
    );
    renderAt('/objectifs', <DoctoralObjectivesPage />);
    expect(await screen.findByText('No associated thesis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profil');
    expect(screen.queryByRole('button', { name: 'New objective' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create objective' })).not.toBeInTheDocument();
  });

  it('lists an objective and refetches when a tab, the search or the overdue filter changes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/dashboard')) return json(dashboard(true));
      return json({ objectives: [objective] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/objectifs', <DoctoralObjectivesPage />);
    const row = await screen.findByRole('link', { name: /Etat de l art/ });
    expect(row).toHaveTextContent('70 %');
    expect(row).toHaveTextContent('Overdue');
    expect(row).not.toHaveTextContent('Haute');
    expect(row).not.toHaveTextContent('Ada Test');

    await user.click(screen.getByRole('tab', { name: 'Upcoming' }));
    await user.type(screen.getByPlaceholderText('Search…'), 'methode');
    await user.click(screen.getByRole('tab', { name: 'Overdue' }));

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('status=PLANNED'))).toBe(true);
    expect(urls.some((url) => url.includes('search=methode'))).toBe(true);
    expect(urls.some((url) => url.includes('overdue=true'))).toBe(true);
  });

  it('shows an empty task list, manual progress and a disabled validation action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard(true));
        if (url.includes('/tasks')) return json({ tasks: [] });
        return json(objective);
      }),
    );
    renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Etat de l art' })).toBeInTheDocument();
    expect(await screen.findByText('No steps yet.')).toBeInTheDocument();
    expect(screen.queryByText(/tâches terminées/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request validation' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'View deliverables' })).toHaveAttribute(
      'href',
      `/livrables?objectiveId=${objectiveId}`,
    );
    expect(
      screen.getByText('Finish the remaining tasks before requesting validation.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New step' })).toBeInTheDocument();
  });

  it('shows the task list, calculated progress and an enabled validation action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => respondDetail(input)),
    );
    const partial = renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByLabelText('Status of Rédiger la synthèse')).toHaveValue('TODO');
    expect(screen.getAllByText('Rédiger la synthèse').length).toBeGreaterThan(0);
    expect(screen.getByText('3 / 4 steps completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request validation' })).toBeDisabled();
    partial.unmount();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard(true));
        if (url.includes('/tasks')) return json({ tasks: sampleTasks() });
        return json({
          ...detailObjective(),
          progress: 100,
          taskSummary: { total: 4, todo: 0, inProgress: 0, done: 4, cancelled: 0 },
        });
      }),
    );
    renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByText('4 / 4 steps completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request validation' })).toBeEnabled();
  });

  it('shows a pending, an approved and a changes-requested review', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        respondDetail(input, { status: 'PENDING', requestedAt: '2026-09-29T10:00:00.000Z' }),
      ),
    );
    const view = renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByText('Validation requested')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request validation' })).not.toBeInTheDocument();
    view.unmount();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        respondDetail(input, {
          status: 'CHANGES_REQUESTED',
          message: 'Préciser la méthode',
        }),
      ),
    );
    const changed = renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByText('Préciser la méthode')).toBeInTheDocument();
    expect(screen.getByText('Changes were requested.')).toBeInTheDocument();
    changed.unmount();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        respondDetail(
          input,
          {
            status: 'APPROVED',
            validatedAt: '2026-09-29T12:00:00.000Z',
            validatedByName: 'Noa Bernard',
          },
          'COMPLETED',
        ),
      ),
    );
    renderAt(`/objectifs/${objectiveId}`, <DoctoralObjectiveDetailPage />);
    expect(await screen.findByText('Objective completed')).toBeInTheDocument();
    expect(screen.getByText('Validated by Noa Bernard')).toBeInTheDocument();
  });
});

describe('supervisor objectives', () => {
  it('shows the create action for a supervised thesis', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/objectives')) return json({ objectives: [] });
        return json({
          id: thesisId,
          title: 'These A',
          status: 'ACTIVE',
          role: 'SUPERVISOR',
          discipline: null,
          institution: null,
          startedOn: null,
          expectedDefenseOn: null,
          members: [],
        });
      }),
    );
    renderAt(`/encadrement/${thesisId}/objectifs`, <SupervisorObjectivesPage />);
    expect(await screen.findByRole('button', { name: 'New objective' })).toBeInTheDocument();
  });

  it('offers task management and the review actions', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/tasks')) return json({ tasks: sampleTasks() });
        if (url.includes('/objectives/')) {
          return json(
            detailObjective({ status: 'PENDING', requestedAt: '2026-09-29T10:00:00.000Z' }),
          );
        }
        return json({
          id: thesisId,
          title: 'These A',
          status: 'ACTIVE',
          role: 'SUPERVISOR',
          discipline: null,
          institution: null,
          startedOn: null,
          expectedDefenseOn: null,
          members: [],
        });
      }),
    );
    renderAt(
      `/encadrement/${thesisId}/objectifs/${objectiveId}`,
      <SupervisorObjectiveDetailPage />,
    );
    expect(await screen.findByRole('button', { name: 'New step' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Rechercher les articles' }));
    expect(
      await screen.findByRole('button', { name: 'Move down Rechercher les articles' }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move up Rechercher les articles' })).toBeDisabled();
    expect(screen.getByText('Validation requested by the student')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate objective' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View deliverables' })).toHaveAttribute(
      'href',
      `/encadrement/${thesisId}/livrables?objectiveId=${objectiveId}`,
    );
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Status of Rechercher les articles')).toHaveTextContent(
      'Cancelled',
    );
    expect(screen.queryByRole('button', { name: 'Request validation' })).not.toBeInTheDocument();
  });
});

function sampleTasks() {
  return [
    task('11111111-1111-4111-8111-111111111111', 'Rechercher les articles', 'DONE', 1),
    task('11111111-1111-4111-8111-111111111112', 'Lire les travaux clés', 'DONE', 2),
    task('11111111-1111-4111-8111-111111111113', 'Annoter les sources', 'DONE', 3),
    task('11111111-1111-4111-8111-111111111114', 'Rédiger la synthèse', 'TODO', 4),
  ];
}

function task(id: string, title: string, status: string, position: number) {
  return {
    id,
    objectiveId,
    title,
    description: null,
    status,
    dueDate: null,
    position,
    origin: 'DOCTORAL_STUDENT',
    completedAt: status === 'DONE' ? '2026-09-20T00:00:00.000Z' : null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  };
}

type ReviewPatch = {
  status?: 'NOT_REQUESTED' | 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED';
  requestedAt?: string | null;
  validatedAt?: string | null;
  message?: string | null;
  validatedByName?: string | null;
};

function detailObjective(review: ReviewPatch = {}, status = 'IN_PROGRESS') {
  return {
    ...objective,
    status,
    progress: 75,
    progressMode: 'TASK_BASED',
    taskSummary: { total: 4, todo: 1, inProgress: 0, done: 3, cancelled: 0 },
    completionReview: { ...objective.completionReview, ...review },
  };
}

function respondDetail(input: RequestInfo | URL, review: ReviewPatch = {}, status = 'IN_PROGRESS') {
  const url = String(input);
  if (url.includes('/dashboard')) return json(dashboard(true));
  if (url.includes('/tasks')) return json({ tasks: sampleTasks() });
  return json(detailObjective(review, status));
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
