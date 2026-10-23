import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../routes/nav';
import { useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { utcToday } from '../dashboard/format';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { useDeliverables } from '../deliverables/hooks/use-deliverables';
import { useMeetings } from '../meetings/hooks/use-meetings';
import { useConversations } from '../messages/hooks/use-messages';
import { useRemarks } from '../remarks/hooks/use-remarks';
import { useThesisDocuments } from './hooks/use-thesis-documents';

type Notice = {
  id: string;
  icon: IconName;
  tone: string;
  title: string;
  detail: MessageKey;
  to: string;
};

export function StudentNotificationsBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const dashboard = useDashboard();
  const thesisId = dashboard.data?.thesis?.id ?? null;
  const desk = useThesisDocuments(thesisId);
  const deliverables = useDeliverables(thesisId, {});
  const meetings = useMeetings(thesisId);
  const remarks = useRemarks(thesisId, {});
  const conversations = useConversations();
  const today = utcToday();

  const notices = useMemo(() => {
    const rows: Notice[] = [];

    for (const item of desk.data?.documents ?? []) {
      if (item.source !== 'SUPERVISOR' || item.status !== 'TO_READ') continue;
      rows.push({
        id: `doc-${item.id}`,
        icon: 'library',
        tone: 'bg-brand-soft text-brand',
        title: item.title,
        detail: 'common.notifyLibraryShare',
        to: '/ressources',
      });
    }

    for (const item of deliverables.data?.deliverables ?? []) {
      if (item.status === 'CHANGES_REQUESTED') {
        rows.push({
          id: `del-changes-${item.id}`,
          icon: 'deliverables',
          tone: 'bg-violet-soft text-violet',
          title: item.title,
          detail: 'common.notifyDeliverableChanges',
          to: `/livrables/${item.id}`,
        });
      }
      if (item.isOverdue && item.status !== 'VALIDATED' && item.status !== 'CANCELLED') {
        rows.push({
          id: `del-late-${item.id}`,
          icon: 'deliverables',
          tone: 'bg-violet-soft text-violet',
          title: item.title,
          detail: 'common.notifyDeliverableOverdue',
          to: `/livrables/${item.id}`,
        });
      }
    }

    for (const item of dashboard.data?.upcomingDeadlines ?? []) {
      if (item.kind !== 'OBJECTIVE' || item.occursOn >= today) continue;
      rows.push({
        id: `obj-${item.id}`,
        icon: 'objectives',
        tone: 'bg-warn-soft text-warn',
        title: item.title,
        detail: 'common.notifyObjectiveOverdue',
        to: `/objectifs/${item.id}`,
      });
    }

    for (const item of meetings.data?.upcoming ?? []) {
      if (item.status === 'REQUESTED') {
        rows.push({
          id: `meet-req-${item.id}`,
          icon: 'meetings',
          tone: 'bg-teal-soft text-teal',
          title: item.title,
          detail: 'common.notifyMeetingRequest',
          to: `/reunions/${item.id}`,
        });
      } else if (item.status === 'PLANNED' && item.scheduledOn && item.scheduledOn >= today) {
        rows.push({
          id: `meet-up-${item.id}`,
          icon: 'meetings',
          tone: 'bg-teal-soft text-teal',
          title: item.title,
          detail: 'common.notifyMeetingUpcoming',
          to: `/reunions/${item.id}`,
        });
      }
    }

    for (const item of remarks.data?.remarks ?? []) {
      if (item.status !== 'OPEN' && item.status !== 'IN_PROGRESS') continue;
      rows.push({
        id: `remark-${item.id}`,
        icon: 'remarks',
        tone: 'bg-danger-soft text-danger',
        title: item.title,
        detail: 'common.notifyRemarkOpen',
        to: `/remarques/${item.id}`,
      });
    }

    for (const item of conversations.data?.conversations ?? []) {
      if (!item.unread) continue;
      const peer =
        item.title?.trim() ||
        item.participants.map((person) => person.displayName).filter(Boolean).join(', ') ||
        t('nav.messages');
      rows.push({
        id: `msg-${item.id}`,
        icon: 'messages',
        tone: 'bg-ok-soft text-ok',
        title: peer,
        detail: 'common.notifyUnreadMessage',
        to: `/messagerie/${item.id}`,
      });
    }

    return rows;
  }, [
    conversations.data?.conversations,
    dashboard.data?.upcomingDeadlines,
    deliverables.data?.deliverables,
    desk.data?.documents,
    meetings.data?.upcoming,
    remarks.data?.remarks,
    t,
    today,
  ]);

  const count = notices.length;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas"
        aria-label={t('common.notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="notice" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={t('common.notifications')}
            className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-semibold text-ink">{t('common.notifications')}</p>
              {count > 0 ? (
                <span className="text-[11px] tabular-nums text-muted">{count}</span>
              ) : null}
            </div>

            {count === 0 ? (
              <p className="px-1 py-4 text-sm text-muted">{t('common.noNotifications')}</p>
            ) : (
              <ul className="grid max-h-80 gap-1.5 overflow-y-auto">
                {notices.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 rounded-xl border border-line px-2.5 py-2.5 transition-colors hover:bg-canvas"
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.tone}`}
                      >
                        <Icon name={item.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{item.title}</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {t(item.detail)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
