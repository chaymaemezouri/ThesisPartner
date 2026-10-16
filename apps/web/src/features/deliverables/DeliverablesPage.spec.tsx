import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import {
  DoctoralDeliverableDetailPage,
  DoctoralDeliverablesPage,
} from './DoctoralDeliverablesPage';
import {
  SupervisorDeliverableDetailPage,
  SupervisorDeliverablesPage,
} from './SupervisorDeliverablesPage';

const thesisId = '22222222-2222-4222-8222-222222222222';
const objectiveId = '33333333-3333-4333-8333-333333333333';
const deliverableId = '55555555-5555-4555-8555-555555555555';

const deliverable = {
  id: deliverableId,
  thesisId,
  title: 'Chapitre 2 — État de l’art',
  description: 'Revue documentaire',
  type: 'THESIS_CHAPTER',
  status: 'DRAFT',
  dueDate: '2026-10-12',
  isOverdue: false,
  objective: { id: objectiveId, title: 'Finaliser l’état de l’art' },
  createdBy: {
    id: '44444444-4444-4444-8444-444444444444',
    givenName: 'Ada',
    familyName: 'Martin',
  },
  taskId: null,
  versionCount: 2,
  latestVersionNumber: 2,
  versionsSummary: {
    count: 2,
    latestVersionNumber: 2,
    latestVersionCreatedAt: '2026-10-05T00:00:00.000Z',
  },
  reviewMessage: null,
  submittedAt: null,
  reviewedAt: null,
  reviewedBy: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T00:00:00.000Z',
};

const versions = {
  versions: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      versionNumber: 2,
      title: null,
      changeSummary: 'Ajout de la section Transformers',
      createdBy: deliverable.createdBy,
      createdAt: '2026-10-05T00:00:00.000Z',
      file: {
        id: '99999999-9999-4999-8999-999999999999',
        originalName: 'chapitre-v2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2_516_582,
        createdAt: '2026-10-05T00:00:00.000Z',
        uploadedBy: deliverable.createdBy,
      },
    },
    {
      id: '77777777-7777-4777-8777-777777777777',
      versionNumber: 1,
      title: null,
      changeSummary: 'Première version',
      createdBy: deliverable.createdBy,
      createdAt: '2026-10-01T00:00:00.000Z',
      file: null,
    },
  ],
};

function listedDeliverable() {
  const {
    description: _description,
    versionsSummary: _summary,
    reviewMessage: _reviewMessage,
    submittedAt: _submittedAt,
    reviewedAt: _reviewedAt,
    reviewedBy: _reviewedBy,
    ...item
  } = deliverable;
  return item;
}

const objective = {
  id: objectiveId,
  thesisId,
  title: 'Finaliser l’état de l’art',
  description: null,
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  startDate: null,
  dueDate: null,
  completedAt: null,
  progress: 0,
  progressMode: 'MANUAL',
  taskSummary: { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 },
  completionReview: {
    status: 'NOT_REQUESTED',
    requestedAt: null,
    validatedAt: null,
    message: null,
    validatedByName: null,
  },
  isOverdue: false,
  responsible: null,
  origin: 'DOCTORAL_STUDENT',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
};

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
    objectives: { total: 1, planned: 0, inProgress: 1, completed: 0, overdue: 0 },
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

function thesisDetail(role: 'DOCTORAL_STUDENT' | 'SUPERVISOR') {
  return {
    id: thesisId,
    title: 'These A',
    status: 'ACTIVE',
    role,
    discipline: null,
    institution: null,
    startedOn: null,
    expectedDefenseOn: null,
    members: [],
  };
}

function renderAt(path: string, node: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/livrables" element={node} />
            <Route path="/livrables/:deliverableId" element={node} />
            <Route path="/encadrement/:thesisId/livrables" element={node} />
            <Route path="/encadrement/:thesisId/livrables/:deliverableId" element={node} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('deliverables', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers to create a deliverable when the student has none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/objectives')) return json({ objectives: [] });
        return json({ deliverables: [] });
      }),
    );
    renderAt('/livrables', <DoctoralDeliverablesPage />);
    expect(await screen.findByText('No deliverables yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create deliverable' })).toBeInTheDocument();
  });

  it('shows the type and status in words and refetches from the tab', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/dashboard')) return json(dashboard());
      if (url.includes('/objectives')) return json({ objectives: [objective] });
      return json({ deliverables: [listedDeliverable()] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/livrables', <DoctoralDeliverablesPage />);
    const row = await screen.findByRole('listitem');
    expect(row).toHaveTextContent('Chapitre 2 — État de l’art');
    expect(row).toHaveTextContent('Thesis chapter');
    expect(row).toHaveTextContent('Draft');
    expect(row).toHaveTextContent('Finaliser l’état de l’art');
    expect(row).toHaveTextContent('V2');

    await user.click(screen.getByRole('tab', { name: 'Drafts' }));
    await user.type(screen.getByPlaceholderText('Search…'), 'anomalie');
    await user.selectOptions(screen.getByLabelText('Type'), 'ARTICLE');
    await user.selectOptions(screen.getByLabelText('Objective'), objectiveId);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('status=DRAFT'))).toBe(true);
    expect(urls.some((url) => url.includes('search=anomalie'))).toBe(true);
    expect(urls.some((url) => url.includes('type=ARTICLE'))).toBe(true);
    expect(urls.some((url) => url.includes(`objectiveId=${objectiveId}`))).toBe(true);
  });

  it('keeps the supervisor list read only', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/objectives')) return json({ objectives: [] });
        if (url.includes('/deliverables')) return json({ deliverables: [] });
        return json(thesisDetail('SUPERVISOR'));
      }),
    );
    renderAt(`/encadrement/${thesisId}/livrables`, <SupervisorDeliverablesPage />);
    expect(await screen.findByText('No deliverables yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New deliverable' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create deliverable' })).not.toBeInTheDocument();
  });

  it('shows version history with the latest revision first', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/versions')) return json(versions);
        return json(deliverable);
      }),
    );
    renderAt(`/livrables/${deliverableId}`, <DoctoralDeliverableDetailPage />);
    expect(
      await screen.findByRole('heading', { name: 'Chapitre 2 — État de l’art' }),
    ).toBeInTheDocument();
    const history = await screen.findByRole('list', { name: 'Version history' });
    const items = history.querySelectorAll('li');
    expect(items[0]).toHaveTextContent('V2');
    expect(items[0]).toHaveTextContent('Latest version');
    expect(items[0]).toHaveTextContent('Ajout de la section Transformers');
    expect(items[1]).toHaveTextContent('V1');
    expect(items[1]).not.toHaveTextContent('Latest version');
    expect(items[0]).toHaveTextContent('chapitre-v2.pdf');
    expect(items[0]).toHaveTextContent('PDF');
    expect(items[1]).toHaveTextContent('No file');
    expect(screen.getByRole('button', { name: 'Add a new version' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a file' })).toBeInTheDocument();
    const documentPanel = screen.getByRole('region', { name: 'Document' });
    expect(documentPanel).toHaveTextContent('chapitre-v2.pdf');
    expect(documentPanel).toHaveTextContent('Version 2');
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('offers the first version when the history is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/versions')) return json({ versions: [] });
        return json({
          ...deliverable,
          versionCount: 0,
          latestVersionNumber: null,
          versionsSummary: {
            count: 0,
            latestVersionNumber: null,
            latestVersionCreatedAt: null,
          },
        });
      }),
    );
    renderAt(`/livrables/${deliverableId}`, <DoctoralDeliverableDetailPage />);
    expect(await screen.findByText('No version yet.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Document' })).toHaveTextContent('No file attached.');
    expect(screen.getByRole('button', { name: 'Create first version' })).toBeInTheDocument();
  });

  it('hides edit actions for a supervisor on a draft', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/versions')) return json(versions);
        if (url.includes('/deliverables/')) return json(deliverable);
        return json({
          ...thesisDetail('SUPERVISOR'),
          members: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              userId: '44444444-4444-4444-8444-444444444444',
              displayName: 'Ada Martin',
              email: 'ada@example.test',
              role: 'DOCTORAL_STUDENT',
              academicTitle: null,
              institution: null,
              laboratory: null,
              doctoralSchool: null,
              specialty: null,
              avatarUrl: null,
            },
          ],
        });
      }),
    );
    renderAt(
      `/encadrement/${thesisId}/livrables/${deliverableId}`,
      <SupervisorDeliverableDetailPage />,
    );
    expect(await screen.findByRole('list', { name: 'Version history' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My students' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ada Martin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel deliverable' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a new version' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create first version' })).not.toBeInTheDocument();
    expect(screen.getAllByText('chapitre-v2.pdf')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Document' })).toHaveTextContent('chapitre-v2.pdf');
    expect(screen.getAllByRole('button', { name: 'Download' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Add a file' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
  });

  it('lets the doctoral student submit a draft with versions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/versions')) return json(versions);
        if (url.includes('/objectives')) return json({ objectives: [objective] });
        return json(deliverable);
      }),
    );
    renderAt(`/livrables/${deliverableId}`, <DoctoralDeliverableDetailPage />);
    expect(await screen.findByRole('button', { name: 'Submit to supervisor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('lets a supervisor review a submitted deliverable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/versions')) return json(versions);
        if (url.includes('/deliverables/')) {
          return json({
            ...deliverable,
            status: 'SUBMITTED',
            submittedAt: '2026-10-06T00:00:00.000Z',
          });
        }
        return json({
          ...thesisDetail('SUPERVISOR'),
          members: [
            {
              id: '88888888-8888-4888-8888-888888888888',
              userId: '44444444-4444-4444-8444-444444444444',
              displayName: 'Ada Martin',
              email: 'ada@example.test',
              role: 'DOCTORAL_STUDENT',
              academicTitle: null,
              institution: null,
              laboratory: null,
              doctoralSchool: null,
              specialty: null,
              avatarUrl: null,
            },
          ],
        });
      }),
    );
    renderAt(
      `/encadrement/${thesisId}/livrables/${deliverableId}`,
      <SupervisorDeliverableDetailPage />,
    );
    expect(await screen.findByText('Submitted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Validate deliverable' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a new version' })).not.toBeInTheDocument();
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
