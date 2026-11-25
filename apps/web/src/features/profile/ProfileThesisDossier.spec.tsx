import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ProfileThesisDossier } from './ProfileThesisDossier';

function renderDossier() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale="en">
        <MemoryRouter>
          <ProfileThesisDossier />
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('ProfileThesisDossier master option', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a project subject when Master student is checked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/theses') && !url.includes('/theses/')) {
          return Response.json({ theses: [] });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    renderDossier();
    expect(await screen.findByLabelText('Thesis title')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Master student/ }));
    expect(screen.getByLabelText('Project subject')).toBeInTheDocument();
  });
});
