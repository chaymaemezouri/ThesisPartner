import { useState, type ReactNode } from 'react';
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
  doctoralSchool?: string | null;
  orcid?: string | null;
  googleScholarUrl?: string | null;
  linkedinUrl?: string | null;
};

export function ThesisInvitationsPanel({
  thesisId,
  hasSupervisor,
  canManage,
  supervisor,
  standalone = false,
}: {
  thesisId: string;
  hasSupervisor: boolean;
  canManage: boolean;
  supervisor?: SupervisorCard | null;
  standalone?: boolean;
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
    <section
      className={standalone ? 'mt-4' : 'mt-4 border-t border-line pt-4'}
      aria-labelledby="thesis-invites"
    >
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
        <SupervisorProfileCard supervisor={supervisor} name={supervisorName} />
      ) : null}

      {pending.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {pending.map((item) => (
            <li key={item.id}>
              <PendingSupervisorCard
                email={item.email}
                invitee={item.invitee}
                statusLabel={t(`invitations.status.${item.status}`)}
                emailStatusLabel={
                  item.emailStatus === 'SENT'
                    ? t('invitations.emailSent')
                    : item.emailStatus === 'FAILED'
                      ? t('invitations.emailFailed')
                      : t('invitations.emailQueued')
                }
                expiresLabel={t('invitations.expires', {
                  date: new Date(item.expiresAt).toLocaleDateString(),
                })}
                replaces={item.replacesSupervisor}
                onResend={() => {
                  setTargetId(item.id);
                  setConfirm('resend');
                }}
                onCancel={() => {
                  setTargetId(item.id);
                  setConfirm('cancel');
                }}
                resendDisabled={resend.isPending}
                cancelDisabled={cancel.isPending}
              />
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

type InviteePublic = {
  displayName: string;
  givenName: string;
  familyName: string;
  academicTitle?: string | null;
  institution?: string | null;
  laboratory?: string | null;
  doctoralSchool?: string | null;
  specialty?: string | null;
  avatarUrl?: string | null;
};

function PendingSupervisorCard({
  email,
  invitee,
  statusLabel,
  emailStatusLabel,
  expiresLabel,
  replaces,
  onResend,
  onCancel,
  resendDisabled,
  cancelDisabled,
}: {
  email: string;
  invitee: InviteePublic | null;
  statusLabel: string;
  emailStatusLabel: string;
  expiresLabel: string;
  replaces: boolean;
  onResend: () => void;
  onCancel: () => void;
  resendDisabled: boolean;
  cancelDisabled: boolean;
}) {
  const t = useT();
  const givenName = invitee?.givenName?.trim() || '';
  const familyName = invitee?.familyName?.trim() || '';
  const avatarLabel =
    [givenName, familyName].filter(Boolean).join(' ').trim() ||
    invitee?.displayName?.trim() ||
    email;

  return (
    <div className="rounded-xl border border-line bg-surface/90 p-4 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar label={avatarLabel} imageUrl={invitee?.avatarUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('invitations.supervisorProfile')}
          </p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            <ProfileField label={t('profile.givenName')} strong>
              {givenName || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.familyName')} strong>
              {familyName || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.academicTitle')}>
              {invitee?.academicTitle?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.specialty')}>
              {invitee?.specialty?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.institution')}>
              {invitee?.institution?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.laboratory')}>
              {invitee?.laboratory?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.doctoralSchool')}>
              {invitee?.doctoralSchool?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('auth.email')}>
              <span className="font-semibold text-ink">{email}</span>
            </ProfileField>
          </dl>
          <p className="mt-3 text-xs text-muted">
            {statusLabel}
            {' · '}
            {emailStatusLabel}
            {replaces ? ` · ${t('invitations.replacesBadge')}` : ''}
            {' · '}
            {expiresLabel}
          </p>
          <p className="mt-1 text-xs text-muted">{t('invitations.contactsHidden')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={resendDisabled}
              onClick={onResend}
            >
              {t('invitations.resend')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-2 text-xs"
              disabled={cancelDisabled}
              onClick={onCancel}
            >
              {t('invitations.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupervisorProfileCard({
  supervisor,
  name,
}: {
  supervisor: SupervisorCard;
  name: string;
}) {
  const t = useT();
  const givenName = supervisor.givenName?.trim() || '';
  const familyName = supervisor.familyName?.trim() || '';
  const links = [
    supervisor.orcid
      ? { label: t('profile.orcid'), href: `https://orcid.org/${supervisor.orcid}`, value: supervisor.orcid }
      : null,
    supervisor.googleScholarUrl
      ? {
          label: t('profile.googleScholar'),
          href: supervisor.googleScholarUrl,
          value: t('invitations.openProfileLink'),
        }
      : null,
    supervisor.linkedinUrl
      ? {
          label: t('profile.linkedin'),
          href: supervisor.linkedinUrl,
          value: t('invitations.openProfileLink'),
        }
      : null,
  ].filter((item): item is { label: string; href: string; value: string } => item !== null);

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface/90 p-4 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar label={name} imageUrl={supervisor.avatarUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('invitations.supervisorProfile')}
          </p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            <ProfileField label={t('profile.givenName')} strong>
              {givenName || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.familyName')} strong>
              {familyName || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.academicTitle')}>
              {supervisor.academicTitle?.trim() || t('common.notProvided')}
            </ProfileField>
            <ProfileField label={t('profile.specialty')}>
              {supervisor.specialty?.trim() || t('common.notProvided')}
            </ProfileField>
          </dl>
          {links.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <ProfileField label={t('profile.institution')}>
          {supervisor.institution?.trim() || t('common.notProvided')}
        </ProfileField>
        <ProfileField label={t('profile.laboratory')}>
          {supervisor.laboratory?.trim() || t('common.notProvided')}
        </ProfileField>
        <ProfileField label={t('profile.doctoralSchool')}>
          {supervisor.doctoralSchool?.trim() || t('common.notProvided')}
        </ProfileField>
        <ProfileField label={t('auth.email')}>
          <a className="font-semibold text-brand hover:underline" href={`mailto:${supervisor.email}`}>
            {supervisor.email}
          </a>
        </ProfileField>
        <ProfileField label={t('profile.phone')}>
          {supervisor.phone?.trim() ? (
            <a
              className="font-semibold text-brand hover:underline"
              href={`tel:${supervisor.phone}`}
            >
              {supervisor.phone}
            </a>
          ) : (
            t('common.notProvided')
          )}
        </ProfileField>
        <ProfileField label={t('profile.orcid')}>
          {supervisor.orcid?.trim() ? (
            <a
              className="font-semibold text-brand hover:underline"
              href={`https://orcid.org/${supervisor.orcid}`}
              target="_blank"
              rel="noreferrer"
            >
              {supervisor.orcid}
            </a>
          ) : (
            t('common.notProvided')
          )}
        </ProfileField>
        <ProfileField label={t('profile.linkedin')}>
          {supervisor.linkedinUrl?.trim() ? (
            <a
              className="font-semibold text-brand hover:underline"
              href={supervisor.linkedinUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('invitations.openProfileLink')}
            </a>
          ) : (
            t('common.notProvided')
          )}
        </ProfileField>
        <ProfileField label={t('profile.googleScholar')}>
          {supervisor.googleScholarUrl?.trim() ? (
            <a
              className="font-semibold text-brand hover:underline"
              href={supervisor.googleScholarUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('invitations.openProfileLink')}
            </a>
          ) : (
            t('common.notProvided')
          )}
        </ProfileField>
      </dl>
    </div>
  );
}

function ProfileField({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`mt-0.5 text-sm text-ink ${strong ? 'font-bold tracking-tight' : ''}`}>
        {children}
      </dd>
    </div>
  );
}
