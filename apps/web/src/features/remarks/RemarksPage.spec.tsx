import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { DoctoralRemarkDetailPage, DoctoralRemarksPage } from './DoctoralRemarksPage';
import { SupervisorRemarkDetailPage, SupervisorRemarksPage } from './SupervisorRemarksPage';

const thesisId = '22222222-2222-4222-8222-222222222222';
const remarkId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const remark = {
  id: remarkId,
  thesisId,
  title: 'Preciser la methodologie',
  message: 'Ajoutez les limites de l etude.',
  status: 'OPEN' as const,
  priority: 'HIGH' as const,
  target: {
    kind: 'DELIVERABLE' as const,
    id: '55555555-5555-4555-8555-555555555555',
    label: 'Chapitre 2',
  },
  location: 'p. 12',
  author: {
    id: '66666666-6666-4666-8666-666666666666',
    givenName: 'Noa',
    familyName: 'Bernard',
  },
  replyCount: 0,
  lastActivityAt: '2026-10-02T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  objectiveId: null,
  taskId: null,
  deliverableId: '55555555-5555-4555-8555-555555555555',
  deliverableVersionId: null,
  correctionVersion: null,
  resolvedAt: null,
  closedAt: null,
  replies: [],
};

function listedRemark() {
  const {
    message: _message,
    objectiveId: _objectiveId,
    taskId: _taskId,
    deliverableId: _deliverableId,
    deliverableVersionId: _deliverableVersionId,
    correctionVersion: _correctionVersion,
    resolvedAt: _resolvedAt,
    closedAt: _closedAt,
    replies: _replies,
    ...item
  } = remark;
  return item;
}

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
      supervisors: [{ displayName: 'Noa Bernard' }],
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

function thesisDetail(role: 'DOCTORAL_STUDENT' | 'SUPERVISOR') {
  return {
    id: thesisId,
    title: 'These A',
    status: 'ACTIVE',
    discipline: null,
    institution: null,
    startedOn: null,
    expectedDefenseOn: null,
    role,
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
  };
}

function renderAt(path: string, node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/remarques" element={node} />
            <Route path="/remarques/:remarkId" element={node} />
            <Route path="/encadrement/:thesisId/remarques" element={node} />
            <Route path="/encadrement/:thesisId/remarques/:remarkId" element={node} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('remarks pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('lists remarks for the doctoral student', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/remarks')) return json({ remarks: [listedRemark()] });
        return json({});
      }),
    );
    renderAt('/remarques', <DoctoralRemarksPage />);
    expect(await screen.findByRole('heading', { name: 'Remarks' })).toBeInTheDocument();
    expect(await screen.findByText('Preciser la methodologie')).toBeInTheDocument();
    expect(screen.getByText(/Chapitre 2/)).toBeInTheDocument();
    expect(screen.getByText(/Student’s turn/)).toBeInTheDocument();
    expect(screen.queryByText('High')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New remark' })).not.toBeInTheDocument();
  });

  it('filters from the workflow and keyboard while keeping the search', async () => {
    const user = userEvent.setup();
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        urls.push(url);
        return json(url.includes('/dashboard') ? dashboard() : { remarks: [listedRemark()] });
      }),
    );
    renderAt('/remarques?search=protocole', <DoctoralRemarksPage />);
    await screen.findByText('Preciser la methodologie');
    await user.click(screen.getByRole('tab', { name: 'In progress' }));
    expect(screen.getByRole('tab', { name: 'In progress' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('textbox', { name: /Search/ })).toHaveValue('protocole');
    expect(
      urls.some((url) => url.includes('status=IN_PROGRESS') && url.includes('search=protocole')),
    ).toBe(true);
    screen.getByRole('tab', { name: 'In progress' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Closed' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    const latest = urls.at(-1) ?? '';
    expect(latest).toContain('search=protocole');
    expect(latest).not.toContain('status=');
  });

  it('lets the doctoral student mark a correction', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/dashboard')) return json(dashboard());
        if (url.includes('/versions')) return json({ versions: [] });
        if (url.includes('/remarks/')) return json(remark);
        return json({});
      }),
    );
    renderAt(`/remarques/${remarkId}`, <DoctoralRemarkDetailPage />);
    expect(
      await screen.findByRole('heading', { name: 'Preciser la methodologie' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correction completed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close remark' })).not.toBeInTheDocument();
  });

  it('lets the supervisor create remarks from the thesis space', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(`/theses/${thesisId}/remarks`)) {
          return json({ remarks: [listedRemark()] });
        }
        if (url.includes('/objectives')) return json({ objectives: [] });
        if (url.includes('/deliverables')) return json({ deliverables: [] });
        if (url.includes(`/theses/${thesisId}`)) return json(thesisDetail('SUPERVISOR'));
        return json({});
      }),
    );
    renderAt(`/encadrement/${thesisId}/remarques`, <SupervisorRemarksPage />);
    expect(await screen.findByRole('button', { name: 'New remark' })).toBeInTheDocument();
    expect(await screen.findByText('Preciser la methodologie')).toBeInTheDocument();
  });

  it('lets the supervisor close a resolved remark', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/versions')) return json({ versions: [] });
        if (url.includes(`/remarks/${remarkId}`)) {
          return json({ ...remark, status: 'RESOLVED' });
        }
        if (url.includes(`/theses/${thesisId}`)) return json(thesisDetail('SUPERVISOR'));
        return json({});
      }),
    );
    renderAt(`/encadrement/${thesisId}/remarques/${remarkId}`, <SupervisorRemarkDetailPage />);
    expect(await screen.findByRole('button', { name: 'Close remark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen remark' })).toBeInTheDocument();
  });
});
