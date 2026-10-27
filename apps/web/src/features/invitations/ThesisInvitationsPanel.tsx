import { useState } from 'react';
import { Button, Input, Textarea } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import {
  useCancelInvitation,
  useCreateInvitation,
  useResendInvitation,
  useSupervisorChange,
  useThesisInvitations,
} from './hooks/use-invitations';

export function ThesisInvitationsPanel({
  thesisId,
  hasSupervisor,
  canManage,
}: {
  thesisId: string;
  hasSupervisor: boolean;
  canManage: boolean;
}) {
  const t = useT();
  const list = useThesisInvitations(thesisId);
  const create = useCreateInvitation(thesisId);
  const change = useSupervisorChange(thesisId);
  const resend = useResendInvitation(thesisId);
  const cancel = useCancelInvitation(thesisId);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'invite' | 'change'>(hasSupervisor ? 'change' : 'invite');

  if (!canManage) return null;

  const pending = list.data?.invitations.filter((item) => item.status === 'PENDING') ?? [];

  const submit = async () => {
    setMessage(null);
    try {
      const result =
        mode === 'change' || hasSupervisor
          ? await (async () => {
              if (!reason.trim()) {
                setMessage(t('invitations.changeReason'));
                return null;
              }
              return change.mutateAsync({ email, reason: reason.trim() });
            })()
          : await create.mutateAsync({ email, role: 'SUPERVISOR' });
      if (!result) return;
      setEmail('');
      setReason('');
      setMessage(
        result.emailStatus === 'SENT' ? t('invitations.sent') : t('invitations.createdUnsent'),
      );
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  return (
    <section className="mt-4 border-t border-line pt-4" aria-labelledby="thesis-invites">
      <h3 id="thesis-invites" className="text-sm font-medium text-ink">
        {t('invitations.manageTitle')}
      </h3>
      <p className="mt-1 text-sm text-muted">{t('invitations.manageSubtitle')}</p>

      {hasSupervisor ? (
        <div className="mt-3 flex gap-2 text-xs">
          <button
            type="button"
            className={mode === 'change' ? 'font-semibold text-ink' : 'text-muted'}
            onClick={() => setMode('change')}
          >
            {t('invitations.changeSupervisor')}
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          id={`invite-email-${thesisId}`}
          label={t('thesis.memberEmail')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="sm:self-end">
          <Button
            type="button"
            disabled={create.isPending || change.isPending || !email.trim()}
            onClick={() => void submit()}
          >
            {hasSupervisor || mode === 'change' ? t('invitations.sendChange') : t('profile.invite')}
          </Button>
        </div>
      </div>
      {(hasSupervisor || mode === 'change') && (
        <div className="mt-3">
          <Textarea
            id={`change-reason-${thesisId}`}
            label={t('invitations.changeReason')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>
      )}
      {message ? (
        <p
          className={`mt-2 text-sm ${message === t('invitations.sent') ? 'text-ok' : 'text-danger'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {list.isLoading ? (
        <p className="mt-4 text-sm text-muted">{t('common.loading')}</p>
      ) : pending.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{item.email}</p>
                <p className="text-xs text-muted">
                  {item.status}
                  {' · '}
                  {item.emailStatus === 'SENT'
                    ? t('invitations.emailSent')
                    : item.emailStatus === 'FAILED'
                      ? t('invitations.emailFailed')
                      : t('invitations.emailQueued')}
                  {item.replacesSupervisor ? ` · ${t('invitations.replacesBadge')}` : ''}
                  {' · '}
                  {t('invitations.expires', {
                    date: new Date(item.expiresAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  disabled={resend.isPending}
                  onClick={() => void resend.mutateAsync(item.id)}
                >
                  {t('invitations.resend')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-2 text-xs"
                  disabled={cancel.isPending}
                  onClick={() => void cancel.mutateAsync(item.id)}
                >
                  {t('invitations.cancel')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">{t('invitations.nonePending')}</p>
      )}
    </section>
  );
}
