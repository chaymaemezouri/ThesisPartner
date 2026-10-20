import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { SupervisorDeskPage } from './SupervisorDeskPage';

const thesisId = '22222222-2222-4222-8222-222222222222';
const objectiveId = '33333333-3333-4333-8333-333333333333';
const desk = {
  notifications: [
    {
      id: 'deliverable-1',
      kind: 'DELIVERABLE',
      thesisId,
      studentName: 'Amina Benjelloun',
      title: 'Article multimodal',
      date: '2026-10-09',
    },
    {
      id: 'deliverable-2',
      kind: 'DELIVERABLE',
      thesisId,
      studentName: 'Yassine El Fassi',
      title: 'Rapport de mesures',
      date: '2026-10-09',
    },
    {
      id: 'remark-1',
      kind: 'REMARK',
      thesisId,
      studentName: 'Amina Benjelloun',
      title: 'Corriger les labels',
      date: '2026-10-08',
    },
    {
      id: 'overdue-1',
      kind: 'OVERDUE',
      thesisId,
      studentName: 'Salma Cherkaoui',
      title: 'Protocole de validation',
      date: '2026-10-01',
    },
    {
      id: 'meeting-1',
      kind: 'MEETING',
      thesisId,
      studentName: 'Salma Cherkaoui',
      title: 'Point de suivi',
      date: null,
    },
  ],
  schedule: [
    {
      id: 'objective-1',
      kind: 'OBJECTIVE',
      thesisId,
      studentName: 'Amina Benjelloun',
      title: 'Finaliser la méthode',
      date: '2099-12-01',
    },
  ],
  publications: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      thesisId,
      studentName: 'Amina Benjelloun',
      title: 'Analyse multimodale',
      venue: 'IEEE',
      year: 2026,
      kind: 'ARTICLE',
      status: 'SUBMITTED',
    },
  ],
  decisions: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      thesisId,
      studentName: 'Amina Benjelloun',
      action: 'deliverable.validated',
      createdAt: '2026-10-08T10:00:00.000Z',
    },
  ],
  plans: [
    {
      thesisId,
      studentName: 'Amina Benjelloun',
      progressPercentage: 25,
      phases: [
        {
          id: objectiveId,
          title: 'Finaliser la méthode',
          startDate: '2026-10-01',
          dueDate: '2099-12-01',
          status: 'IN_PROGRESS',
          progress: 25,
        },
      ],
    },
  ],
  evaluations: [],
};

function renderDesk(path = '/suivi') {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(desk), { headers: { 'content-type': 'application/json' } }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <SupervisorDeskPage />
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('supervisor follow-up', () => {
  it('combines notification type with student search and resets an empty result', async () => {
    const user = userEvent.setup();
    renderDesk();
    const article = await screen.findByRole('link', { name: /Article multimodal/ });
    expect(article).toHaveAttribute('href', `/encadrement/${thesisId}/livrables`);
    expect(screen.getByRole('link', { name: /Corriger les labels/ })).toHaveAttribute(
      'href',
      `/encadrement/${thesisId}/remarques`,
    );
    const types = screen.getByRole('group', { name: 'Notification type' });
    await user.click(within(types).getByRole('button', { name: 'Deliverable to review' }));
    expect(screen.queryByRole('link', { name: /Corriger les labels/ })).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: /Search a student/ });
    await user.type(search, 'Amina');
    expect(screen.getByRole('link', { name: /Article multimodal/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Rapport de mesures/ })).not.toBeInTheDocument();
    await user.type(search, ' unknown');
    expect(screen.getByText('No notification matches these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('link', { name: /Point de suivi/ })).toHaveAttribute(
      'href',
      `/encadrement/${thesisId}/reunions`,
    );
  });

  it('keeps all follow-up sections accessible from direct links and the menu', async () => {
    const user = userEvent.setup();
    renderDesk('/suivi?vue=plan');
    await screen.findByRole('heading', { name: 'Research plan' });
    expect(screen.getByRole('link', { name: /Finaliser la méthode/ })).toHaveAttribute(
      'href',
      `/encadrement/${thesisId}/objectifs/${objectiveId}`,
    );
    const menu = screen.getByRole('navigation', { name: 'Follow-up' });
    await user.click(within(menu).getByRole('button', { name: 'Academic schedule' }));
    expect(screen.getByRole('heading', { name: 'Academic schedule' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Progress reports' }));
    await user.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByRole('heading', { name: 'Amina Benjelloun' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Periodic evaluation' }));
    expect(screen.getByRole('button', { name: 'Record evaluation' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('button', { name: 'Scientific publications' }));
    expect(screen.getByRole('combobox', { name: 'Scientific publications' })).toHaveValue(
      'SUBMITTED',
    );
    await user.click(within(menu).getByRole('button', { name: 'Decision history' }));
    expect(screen.getByRole('link', { name: /Deliverable validated/ })).toHaveAttribute(
      'href',
      `/encadrement/${thesisId}`,
    );
  });
});
