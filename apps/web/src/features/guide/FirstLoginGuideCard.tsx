import { useEffect, useMemo, useState } from 'react';
import { Button } from '@thesispartner/ui';
import doctoralGuide from '../../assets/guide-card/doctoral-student.png';
import supervisorGuide from '../../assets/guide-card/supervisor.png';
import { useInvitationInbox } from '../invitations/hooks/use-invitations';
import { useSupervisedTheses } from '../supervision/hooks/use-supervised-theses';
import { isSupervisorWorkspace } from '../supervision/workspace-mode';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';

type GuideRole = 'doctoral' | 'supervisor';

const STORAGE_PREFIX = 'tp_guide_card_seen_v1';

function storageKey(userId: string, role: GuideRole) {
  return `${STORAGE_PREFIX}:${userId}:${role}`;
}

function hasSeenGuide(userId: string, role: GuideRole) {
  try {
    return localStorage.getItem(storageKey(userId, role)) === '1';
  } catch {
    return false;
  }
}

function markGuideSeen(userId: string, role: GuideRole) {
  try {
    localStorage.setItem(storageKey(userId, role), '1');
  } catch {
    /* Session-only dismiss if storage is unavailable. */
  }
}

/**
 * One-shot first-login guide card (doctoral or supervisor-via-invite).
 * Centered card, flow backdrop, download at the top — shown once per user/role.
 */
export function FirstLoginGuideCard() {
  const t = useT();
  const me = useMeQuery();
  const supervised = useSupervisedTheses();
  const inbox = useInvitationInbox();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<GuideRole | null>(null);

  const userId = me.data?.user.id;
  const emailVerified = Boolean(me.data?.user.emailVerified);
  const supervisorMode = isSupervisorWorkspace(supervised.data);
  const pendingInvite = (inbox.data?.invitations ?? []).some(
    (item) => item.status === 'PENDING' && item.role === 'SUPERVISOR',
  );

  const resolvedRole = useMemo<GuideRole | null>(() => {
    if (!userId || !emailVerified) return null;
    if (supervised.isLoading || inbox.isLoading) return null;
    // Supervisor first path: invitation pending or already in supervisor workspace.
    if (supervisorMode || pendingInvite) return 'supervisor';
    return 'doctoral';
  }, [
    userId,
    emailVerified,
    supervised.isLoading,
    inbox.isLoading,
    supervisorMode,
    pendingInvite,
  ]);

  useEffect(() => {
    if (!userId || !resolvedRole) {
      setOpen(false);
      setRole(null);
      return;
    }
    if (hasSeenGuide(userId, resolvedRole)) {
      setOpen(false);
      setRole(null);
      return;
    }
    setRole(resolvedRole);
    setOpen(true);
  }, [userId, resolvedRole]);

  if (!open || !role || !userId) return null;

  const imageSrc = role === 'supervisor' ? supervisorGuide : doctoralGuide;
  const fileName =
    role === 'supervisor' ? 'thesis-flow-guide-supervisor.png' : 'thesis-flow-guide-doctoral.png';
  const title =
    role === 'supervisor' ? t('guideCard.supervisorTitle') : t('guideCard.doctoralTitle');

  function dismiss() {
    markGuideSeen(userId!, role!);
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={t('common.close')}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.35),_transparent_55%),linear-gradient(160deg,_rgba(15,23,42,0.72),_rgba(30,64,175,0.55))] backdrop-blur-md"
        onClick={dismiss}
      />
      <div className="relative z-[1] flex w-full max-w-5xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.25)] backdrop-blur-sm">
          <p className="min-w-0 truncate text-sm font-semibold text-white">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={imageSrc}
              download={fileName}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/30 bg-white/95 px-3 text-xs font-semibold text-ink hover:bg-white"
            >
              {t('guideCard.download')}
            </a>
            <Button
              type="button"
              variant="secondary"
              className="h-9 border-white/30 bg-white/20 px-3 text-xs text-white hover:bg-white/30"
              onClick={dismiss}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/25 bg-surface shadow-[0_24px_60px_rgba(15,23,42,0.35)]">
          <img
            src={imageSrc}
            alt={title}
            className="block h-auto max-h-[min(78vh,44rem)] w-full object-contain bg-[#0b2a6b]"
            draggable={false}
          />
        </div>
        <p className="text-center text-xs text-white/80">{t('guideCard.onceHint')}</p>
      </div>
    </div>
  );
}
