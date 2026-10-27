import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ThesisInvitationsPanel } from './ThesisInvitationsPanel';

vi.mock('./hooks/use-invitations', () => ({
  useThesisInvitations: () => ({ data: { invitations: [] }, isLoading: false }),
  useCreateInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useSupervisorChange: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useResendInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCancelInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

function renderPanel(
  props: Partial<Parameters<typeof ThesisInvitationsPanel>[0]> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <ThesisInvitationsPanel
          thesisId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
          hasSupervisor={false}
          canManage
          {...props}
        />
      </QueryClientProvider>
    </LocaleProvider>,
  );
}

describe('ThesisInvitationsPanel supervisor details', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not show contact details before the supervisor accepts', () => {
    renderPanel();
    expect(
      screen.getByText(/joins only after accepting the email invitation/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nora')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Member email')).toBeInTheDocument();
  });

  it('shows name, email and phone from the supervisor profile after accept', () => {
    renderPanel({
      hasSupervisor: true,
      supervisor: {
        givenName: 'Nora',
        familyName: 'Bernard',
        email: 'nora@example.test',
        phone: '+212 6 12 34 56 78',
      },
    });
    expect(screen.getByText(/has joined/i)).toBeInTheDocument();
    expect(screen.getByText('Nora')).toBeInTheDocument();
    expect(screen.getByText('Bernard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'nora@example.test' })).toHaveAttribute(
      'href',
      'mailto:nora@example.test',
    );
    expect(screen.getByRole('link', { name: '+212 6 12 34 56 78' })).toHaveAttribute(
      'href',
      'tel:+212 6 12 34 56 78',
    );
  });

  it('marks missing profile fields when the supervisor has not filled them', () => {
    renderPanel({
      hasSupervisor: true,
      supervisor: { givenName: 'Nora', familyName: '', email: 'nora@example.test', phone: null },
    });
    expect(screen.getAllByText('Not provided')).toHaveLength(2);
  });
});
