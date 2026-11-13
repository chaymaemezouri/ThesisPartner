import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Modal } from '@thesispartner/ui';
import { invitationSummarySchema } from '@thesispartner/validation';
import { ApiClientError, apiSend } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { useInvitationInbox } from './hooks/use-invitations';

export function InvitationsInboxPage() {
  const t = useT();
  const inbox = useInvitationInbox();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; action: 'accept' | 'reject' } | null>(null);

  const respondById = useMutation({
    mutationFn: (input: { id: string; action: 'accept' | 'reject' }) =>
      apiSend(`/api/v1/invitations/${input.id}/${input.action}`, invitationSummarySchema, {}),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
      await client.invalidateQueries({ queryKey: ['theses'] });
      await client.invalidateQueries({ queryKey: ['supervision'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
      if (variables.action === 'accept') {
        window.location.assign('/encadrement');
      }
    },
  });

  const pending = (inbox.data?.invitations ?? []).filter((item) => item.status === 'PENDING');
  const history = (inbox.data?.invitations ?? []).filter((item) => item.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="sr-only">{t('invitations.inboxTitle')}</h1>
        <p className="text-sm text-muted">{t('invitations.inboxSubtitle')}</p>
      </header>

      {inbox.isLoading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : inbox.isError ? (
        <p className="text-sm text-danger" role="alert">
          {inbox.error instanceof ApiClientError ? inbox.error.body.message : t('errors.generic')}
        </p>
      ) : inbox.data && inbox.data.invitations.length === 0 ? (
        <p className="text-sm text-muted">{t('invitations.inboxEmpty')}</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">{t('invitations.inboxPendingTitle')}</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted">{t('invitations.nonePending')}</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((item) => {
                  const student = item.doctoralStudent;
                  const name = student
                    ? `${student.givenName} ${student.familyName}`.trim() || student.displayName
                    : item.invitedByName;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4"
                    >
                      <div className="flex min-w-0 gap-3">
                        <Avatar label={name} imageUrl={student?.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{item.thesisTitle}</p>
                          <p className="mt-1 text-sm text-muted">
                            {name}
                            {student?.institution ? ` · ${student.institution}` : ''}
                            {item.thesisInstitution && !student?.institution
                              ? ` · ${item.thesisInstitution}`
                              : ''}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {student
                              ? t('invitations.doctoralYear', { year: student.doctoralYear })
                              : item.thesisDoctoralYear
                                ? t('invitations.doctoralYear', { year: item.thesisDoctoralYear })
                                : null}
                            {' · '}
                            {t('invitations.staysOpen')}
                            {item.replacesSupervisor ? ` · ${t('invitations.replacesBadge')}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="warn">{t('invitations.status.PENDING')}</Badge>
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs"
                          disabled={respondById.isPending}
                          onClick={() => setConfirm({ id: item.id, action: 'accept' })}
                        >
                          {t('invitations.accept')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={respondById.isPending}
                          onClick={() => setConfirm({ id: item.id, action: 'reject' })}
                        >
                          {t('invitations.reject')}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {history.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-ink">{t('invitations.inboxHistoryTitle')}</h2>
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{item.thesisTitle}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.doctoralStudent?.displayName ?? item.invitedByName}
                        {item.replacesSupervisor ? ` · ${t('invitations.replacesBadge')}` : ''}
                      </p>
                    </div>
                    <Badge
                      tone={
                        item.status === 'ACCEPTED'
                          ? 'ok'
                          : item.status === 'REJECTED' || item.status === 'EXPIRED'
                            ? 'warn'
                            : 'neutral'
                      }
                    >
                      {t(`invitations.status.${item.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      {respondById.isError ? (
        <p className="text-sm text-danger" role="alert">
          {respondById.error instanceof ApiClientError
            ? respondById.error.body.message
            : t('errors.generic')}
        </p>
      ) : null}

      <Modal
        open={confirm !== null}
        title={
          confirm?.action === 'accept'
            ? t('invitations.confirmAcceptTitle')
            : t('invitations.confirmRejectTitle')
        }
        closeLabel={t('common.close')}
        onClose={() => setConfirm(null)}
      >
        <p className="text-sm text-ink">
          {confirm?.action === 'accept'
            ? t('invitations.confirmAcceptBody')
            : t('invitations.confirmRejectBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={respondById.isPending || !confirm}
            onClick={() => {
              if (!confirm) return;
              void respondById.mutateAsync(confirm).finally(() => setConfirm(null));
            }}
          >
            {t('common.confirm')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
