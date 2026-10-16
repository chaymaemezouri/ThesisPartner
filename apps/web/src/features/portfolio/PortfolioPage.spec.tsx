import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { PortfolioPage } from './PortfolioPage';

function portfolio() {
  return {
    profile: {
      displayName: 'Youssef El Amrani',
      specialty: 'Informatique',
      academicTitle: null,
      avatarUrl: null,
    },
    counts: { publications: 1, conferences: 1, projects: 1 },
    publications: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'Deep Learning for Anomaly Detection',
        venue: 'IEEE',
        year: 2026,
        kind: 'ARTICLE',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'Vision Transformers for Medical Imaging',
        venue: 'Springer',
        year: 2025,
        kind: 'CONFERENCE',
      },
    ],
    projects: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        title: 'Jeu de données',
        summary: null,
      },
    ],
    skills: [],
  };
}

describe('portfolio page', () => {
  afterEach(() => cleanup());

  it('shows the identity, the counts and the recent publications', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(JSON.stringify(portfolio()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <LocaleProvider initialLocale="en">
        <QueryClientProvider client={client}>
          <PortfolioPage />
        </QueryClientProvider>
      </LocaleProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
    expect(await screen.findByText('Youssef El Amrani')).toBeInTheDocument();
    expect(screen.getByText('Doctoral student in Informatique')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning for Anomaly Detection')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBe(3);
  });
});
