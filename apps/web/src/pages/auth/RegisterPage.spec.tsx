import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { RegisterPage } from './RegisterPage';

describe('RegisterPage master option', () => {
  it('asks for a project subject when Master student is checked', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LocaleProvider initialLocale="en">
          <MemoryRouter>
            <RegisterPage />
          </MemoryRouter>
        </LocaleProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByLabelText('Project subject')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Master student/ }));
    expect(screen.getByLabelText('Project subject')).toBeInTheDocument();
  });
});
