import { useState } from 'react';
import { Avatar, Badge, Button, Input, Modal, Textarea } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import {
  useCancelInvitation,
  useCreateInvitation,
  useResendInvitation,
  useSupervisorChange,
  useThesisInvitations,
} from './hooks/use-invitations';

type SupervisorCard = {
  givenName?: string;
  familyName?: string;
  displayName?: string;
  email: string;
  phone?: string | null;
  institution?: string | null;
  specialty?: string | null;
  academicTitle?: string | null;
  avatarUrl?: string | null;
  laboratory?: string | null;
};

export function ThesisInvitationsPanel({
  thesisId,
  hasSupervisor,
  canManage,
  supervisor,
}: {
  thesisId: string;
  hasSupervisor: boolean;
  canManage: boolean;
  supervisor?: SupervisorCard | null;
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
  const [messageOk, setMessageOk] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'resend' | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [showChange, setShowChange] = useState(false);

  if (!canManage) return null;

  const invitations = list.data?.invitations ?? [];
  const pending = invitations.filter((item) => item.status === 'PENDING');
  const pendingReplace = pending.find((item) => item.replacesSupervisor);
  const pendingInvite = pending.find((item) => !item.replacesSupervisor);
  const history = invitations.filter((item) => item.status !== 'PENDING').slice(0, 5);

  const state: 'none' | 'pending' | 'active' | 'replacement' = hasSupervisor
    ? pendingReplace
      ? 'replacement'
      : 'active'
    : pendingInvite || pending.length > 0
      ? 'pending'
      : 'none';

  const supervisorName =
    [supervisor?.givenName, supervisor?.familyName].filter(Boolean).join(' ').trim() ||
    supervisor?.displayName ||
    t('common.notProvided');

  const submitInvite = async () => {
    setMessage(null);
    try {
      const result =
        state === 'active' || state === 'replacement' || showChange
          ? await (async () => {
              if (!reason.trim()) {
                setMessage(t('invitations.changeReason'));
                setMessageOk(false);
                return null;
              }
              return change.mutateAsync({ email, reason: reason.trim() });
            })()
          : await create.mutateAsync({ email, role: 'SUPERVISOR' });
      if (!result) return;
      setEmail('');
      setReason('');
      setShowChange(false);
      const ok = result.emailStatus === 'SENT';
      setMessageOk(ok);
      setMessage(ok ? t('invitations.sent') : t('invitations.createdUnsent'));
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  const runConfirm = async () => {
    if (!targetId || !confirm) return;
    try {
      const result =
        confirm === 'resend'
          ? await resend.mutateAsync(targetId)
          : await cancel.mutateAsync(targetId);
      setMessageOk(confirm === 'resend' ? result.emailStatus === 'SENT' : true);
      setMessage(
        confirm === 'resend'
          ? result.emailStatus === 'SENT'
            ? t('invitations.sent')
            : t('invitations.createdUnsent')
          : t('invitations.cancelled'),
      );
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    } finally {
      setConfirm(null);
      setTargetId(null);
    }
  };

  return (
    <section className="mt-4 border-t border-line pt-4" aria-labelledby="thesis-invites">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="thesis-invites" className="text-sm font-medium text-ink">
            {t('invitations.supervisorTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {state === 'none'
              ? t('invitations.manageSubtitle')
              : state === 'pending'
                ? t('invitations.pendingSubtitle')
                : state === 'replacement'
                  ? t('invitations.replacementSubtitle')
                  : t('invitations.acceptedSubtitle')}
          </p>
        </div>
        <Badge tone={state === 'active' ? 'ok' : state === 'none' ? 'neutral' : 'warn'}>
          {t(`invitations.state.${state}`)}
        </Badge>
      </div>

      {supervisor && (state === 'active' || state === 'replacement') ? (
        <div className="mt-3 flex gap-3 rounded-xl border border-line bg-surface/80 p-3">
          <Avatar label={supervisorName} imageUrl={supervisor.avatarUrl} size="md" />
          <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted">{t('profile.displayName')}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">
                {supervisor.academicTitle
                  ? `${supervisor.academicTitle} ${supervisorName}`
                  : supervisorName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{t('profile.specialty')}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {supervisor.specialty?.trim() || t('common.notProvided')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{t('profile.institution')}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {supervisor.institution?.trim() ||
                  supervisor.laboratory?.trim() ||
                  t('common.notProvided')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{t('auth.email')}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                <a
                  className="font-medium text-brand hover:underline"
                  href={`mailto:${supervisor.email}`}
                >
                  {supervisor.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{t('profile.phone')}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {supervisor.phone?.trim() ? (
                  <a
                    className="font-medium text-brand hover:underline"
                    href={`tel:${supervisor.phone}`}
                  >
                    {supervisor.phone}
                  </a>
                ) : (
                  t('common.notProvided')
                )}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{item.email}</p>
                <p className="text-xs text-muted">
                  {t(`invitations.status.${item.status}`)}
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
                <p className="mt-1 text-xs text-muted">{t('invitations.contactsHidden')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  disabled={resend.isPending}
                  onClick={() => {
                    setTargetId(item.id);
                    setConfirm('resend');
                  }}
                >
                  {t('invitations.resend')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-2 text-xs"
                  disabled={cancel.isPending}
                  onClick={() => {
                    setTargetId(item.id);
                    setConfirm('cancel');
                  }}
                >
                  {t('invitations.cancel')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : state === 'none' ? (
        <p className="mt-3 text-sm text-muted">{t('invitations.nonePending')}</p>
      ) : null}

      {(state === 'none' || showChange) && pending.length === 0 ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
                onClick={() => void submitInvite()}
              >
                {hasSupervisor || showChange ? t('invitations.sendChange') : t('profile.invite')}
              </Button>
            </div>
          </div>
          {(hasSupervisor || showChange) && (
            <Textarea
              id={`change-reason-${thesisId}`}
              label={t('invitations.changeReason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              maxLength={500}
            />
          )}
        </div>
      ) : null}

      {state === 'active' && pending.length === 0 && !showChange ? (
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={() => setShowChange(true)}>
            {t('invitations.changeSupervisor')}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className={`mt-2 text-sm ${messageOk ? 'text-ok' : 'text-danger'}`} role="status">
          {message}
        </p>
      ) : null}

      {list.isLoading ? (
        <p className="mt-4 text-sm text-muted">{t('common.loading')}</p>
      ) : history.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium tracking-wide text-muted uppercase">
            {t('invitations.historyTitle')}
          </h4>
          <ul className="mt-2 space-y-1">
            {history.map((item) => (
              <li key={item.id} className="text-xs text-muted">
                {item.email} · {t(`invitations.status.${item.status}`)}
                {item.respondedAt ? ` · ${new Date(item.respondedAt).toLocaleDateString()}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal
        open={confirm !== null}
        title={
          confirm === 'resend'
            ? t('invitations.confirmResendTitle')
            : t('invitations.confirmCancelTitle')
        }
        closeLabel={t('common.close')}
        onClose={() => {
          setConfirm(null);
          setTargetId(null);
        }}
      >
        <p className="text-sm text-ink">
          {confirm === 'resend'
            ? t('invitations.confirmResendBody')
            : t('invitations.confirmCancelBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={resend.isPending || cancel.isPending}
            onClick={() => void runConfirm()}
          >
            {t('common.confirm')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirm(null);
              setTargetId(null);
            }}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
