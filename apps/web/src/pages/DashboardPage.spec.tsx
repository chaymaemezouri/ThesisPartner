import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../features/dashboard/DashboardView', () => ({
  DashboardView: () => <p>Doctoral dashboard</p>,
}));
vi.mock('../features/supervision/SupervisorDashboard', () => ({
  SupervisorDashboard: () => <p>Supervisor dashboard</p>,
}));

function renderDashboard(cached?: { theses: { thesisId: string }[] }, staleTime = Infinity) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } });
  if (cached) client.setQueryData(['supervision', 'theses'], cached);
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale="en">
        <DashboardPage />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('dashboard selection', () => {
  it.each([undefined, { theses: [] }])(
    'waits for supervision before choosing a doctoral dashboard, including stale empty data',
    (cached) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise(() => undefined)),
      );
      renderDashboard(cached, 0);
      expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
      expect(screen.queryByText('Doctoral dashboard')).not.toBeInTheDocument();
    },
  );

  it('does not mistake a supervision API failure for a doctoral account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    renderDashboard();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Doctoral dashboard')).not.toBeInTheDocument();
  });

  it.each([
    { theses: [], expected: 'Doctoral dashboard' },
    { theses: [{ thesisId: 'accepted-thesis' }], expected: 'Supervisor dashboard' },
  ])('shows $expected after supervision is known', ({ theses, expected }) => {
    renderDashboard({ theses });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
