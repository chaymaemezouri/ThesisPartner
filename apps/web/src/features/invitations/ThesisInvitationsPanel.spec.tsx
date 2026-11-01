import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ThesisInvitationsPanel } from './ThesisInvitationsPanel';

const invitationsState = vi.hoisted(() => ({
  data: { invitations: [] as Array<Record<string, unknown>> },
}));

vi.mock('./hooks/use-invitations', () => ({
  useThesisInvitations: () => ({ data: invitationsState.data, isLoading: false }),
  useCreateInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useSupervisorChange: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useResendInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCancelInvitation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

function renderPanel(props: Partial<Parameters<typeof ThesisInvitationsPanel>[0]> = {}) {
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
    invitationsState.data = { invitations: [] };
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

  it('shows name, email, phone and academic links from the supervisor profile after accept', () => {
    renderPanel({
      hasSupervisor: true,
      supervisor: {
        givenName: 'Nora',
        familyName: 'Bernard',
        email: 'nora@example.test',
        phone: '+212 6 12 34 56 78',
        institution: 'Université de Lille',
        specialty: 'Ecology',
        orcid: '0000-0002-1825-0097',
        linkedinUrl: 'https://www.linkedin.com/in/nora-bernard',
        googleScholarUrl: 'https://scholar.google.com/citations?user=nora',
      },
    });
    expect(screen.getByText(/has joined/i)).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();
    expect(screen.getByText('Nora')).toBeInTheDocument();
    expect(screen.getByText('Bernard')).toBeInTheDocument();
    expect(screen.getByText('Université de Lille')).toBeInTheDocument();
    expect(screen.getAllByText('Ecology').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: 'nora@example.test' })).toHaveAttribute(
      'href',
      'mailto:nora@example.test',
    );
    expect(screen.getByRole('link', { name: '+212 6 12 34 56 78' })).toHaveAttribute(
      'href',
      'tel:+212 6 12 34 56 78',
    );
    expect(screen.getByRole('link', { name: '0000-0002-1825-0097' })).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0002-1825-0097',
    );
    expect(screen.getAllByRole('link', { name: 'ORCID' })[0]).toHaveAttribute(
      'href',
      'https://orcid.org/0000-0002-1825-0097',
    );
    expect(screen.getAllByRole('link', { name: 'LinkedIn' })[0]).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/nora-bernard',
    );
    expect(screen.getAllByRole('link', { name: 'Google Scholar' })[0]).toHaveAttribute(
      'href',
      'https://scholar.google.com/citations?user=nora',
    );
  });

  it('marks missing profile fields when the supervisor has not filled them', () => {
    renderPanel({
      hasSupervisor: true,
      supervisor: { givenName: 'Nora', familyName: '', email: 'nora@example.test', phone: null },
    });
    expect(screen.getAllByText('Not provided').length).toBeGreaterThanOrEqual(2);
  });

  it('shows pending invitee first and last name when the account already exists', () => {
    invitationsState.data = {
      invitations: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          thesisId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          thesisTitle: 'Thesis',
          thesisInstitution: null,
          thesisDoctoralYear: null,
          email: 'samir@example.test',
          role: 'SUPERVISOR',
          status: 'PENDING',
          emailStatus: 'SENT',
          replacesSupervisor: false,
          changeReason: null,
          invitedByName: 'Jihane',
          doctoralStudent: null,
          invitee: {
            displayName: 'Samir Alaoui',
            givenName: 'Samir',
            familyName: 'Alaoui',
            academicTitle: 'Prof.',
            institution: 'UM5',
            laboratory: 'Lab AI',
            doctoralSchool: null,
            specialty: 'NLP',
            avatarUrl: null,
          },
          expiresAt: '2026-11-15T00:00:00.000Z',
          createdAt: '2026-11-01T00:00:00.000Z',
          respondedAt: null,
        },
      ],
    };
    renderPanel();
    expect(screen.getByText('Samir')).toBeInTheDocument();
    expect(screen.getByText('Alaoui')).toBeInTheDocument();
    expect(screen.getByText('Prof.')).toBeInTheDocument();
    expect(screen.getByText('UM5')).toBeInTheDocument();
    expect(screen.getByText('NLP')).toBeInTheDocument();
    expect(screen.getByText('samir@example.test')).toBeInTheDocument();
    expect(screen.queryByText(/tel:/i)).not.toBeInTheDocument();
  });
});
