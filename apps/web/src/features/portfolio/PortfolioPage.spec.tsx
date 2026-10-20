import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

function renderPortfolio() {
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
        <MemoryRouter>
          <PortfolioPage />
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('portfolio page', () => {
  afterEach(() => cleanup());

  it('shows the identity, the counts and the recent publications', async () => {
    renderPortfolio();
    expect(await screen.findByRole('heading', { name: 'Portfolio' })).toBeInTheDocument();
    expect(await screen.findByText('Youssef El Amrani')).toBeInTheDocument();
    expect(screen.getByText('Doctoral student in Informatique')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning for Anomaly Detection')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBe(3);
  });
  it('opens matching publications from the counters and combines type with search', async () => {
    const user = userEvent.setup();
    renderPortfolio();
    await screen.findByText('Youssef El Amrani');
    await user.click(screen.getByRole('button', { name: /^Conferences/ }));
    expect(screen.getByRole('tab', { name: 'Publications' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Conference' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Vision Transformers for Medical Imaging')).toBeInTheDocument();
    expect(screen.queryByText('Deep Learning for Anomaly Detection')).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /Search/ }), 'IEEE');
    expect(screen.getByText('No publication matches these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Deep Learning for Anomaly Detection')).toBeInTheDocument();
    expect(screen.queryByText('Vision Transformers for Medical Imaging')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'CV' }));
    await user.click(screen.getByRole('button', { name: /^Projects/ }));
    expect(screen.getByRole('tab', { name: 'Projects' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens preview sections and keeps tabs accessible from the keyboard', async () => {
    const user = userEvent.setup();
    renderPortfolio();
    await screen.findByText('Youssef El Amrani');
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/profil');
    await user.click(screen.getByRole('button', { name: 'View section: Skills' }));
    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Add a skill' }));
    expect(screen.getByRole('dialog', { name: 'Add a skill' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    screen.getByRole('tab', { name: 'Skills' }).focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'CV' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveAttribute('aria-selected', 'true');
  });
});
