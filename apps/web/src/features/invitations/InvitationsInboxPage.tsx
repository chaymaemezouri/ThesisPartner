import { Button } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { useInvitationInbox, useRespondInvitation } from './hooks/use-invitations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationSummarySchema } from '@thesispartner/validation';
import { apiSend } from '../../api/client';

export function InvitationsInboxPage() {
  const t = useT();
  const inbox = useInvitationInbox();
  const client = useQueryClient();
  const respondToken = useRespondInvitation();

  const respondById = useMutation({
    mutationFn: (input: { id: string; action: 'accept' | 'reject' }) =>
      apiSend(`/api/v1/invitations/${input.id}/${input.action}`, invitationSummarySchema, {}),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
      await client.invalidateQueries({ queryKey: ['theses'] });
      await client.invalidateQueries({ queryKey: ['supervision'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const pending = respondById.isPending || respondToken.isPending;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          {t('invitations.inboxTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('invitations.inboxSubtitle')}</p>
      </header>

      {inbox.isLoading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : inbox.isError ? (
        <p className="text-sm text-danger" role="alert">
          {inbox.error instanceof ApiClientError ? inbox.error.body.message : t('errors.generic')}
        </p>
      ) : inbox.data && inbox.data.invitations.length === 0 ? (
        <p className="text-sm text-muted">{t('invitations.inboxEmpty')}</p>
      ) : inbox.data ? (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {inbox.data.invitations.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{item.thesisTitle}</p>
                <p className="mt-1 text-sm text-muted">
                  {item.invitedByName} · {item.status}
                  {item.replacesSupervisor ? ` · ${t('invitations.replacesBadge')}` : ''}
                </p>
              </div>
              {item.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="h-8 px-3 text-xs"
                    disabled={pending}
                    onClick={() => void respondById.mutateAsync({ id: item.id, action: 'accept' })}
                  >
                    {t('invitations.accept')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    disabled={pending}
                    onClick={() => void respondById.mutateAsync({ id: item.id, action: 'reject' })}
                  >
                    {t('invitations.reject')}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {respondById.isError ? (
        <p className="text-sm text-danger" role="alert">
          {respondById.error instanceof ApiClientError
            ? respondById.error.body.message
            : t('errors.generic')}
        </p>
      ) : null}
    </div>
  );
}
