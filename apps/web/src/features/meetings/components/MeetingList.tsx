import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import type { Meeting } from '../hooks/use-meetings';
import { MeetingStatusBadge } from './MeetingStatusBadge';

function formatDay(value: string, locale: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(locale, { timeZone: 'UTC' });
}

function placeLine(item: Meeting, t: ReturnType<typeof useT>) {
  if (!item.scheduledOn || !item.mode) return t('meetings.dateUnset');
  if (item.mode === 'ONLINE') return t('meetings.modeLabel.ONLINE');
  return item.location?.trim() || t('meetings.modeLabel.IN_PERSON');
}

export function MeetingList({
  meetings,
  detailPath,
}: {
  meetings: Meeting[];
  detailPath: (meetingId: string) => string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  return (
    <ul className="divide-y divide-line" aria-label={t('meetings.listAria')}>
      {meetings.map((item) => (
        <li key={item.id}>
          <Link
            to={detailPath(item.id)}
            className="flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-canvas/70"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                {item.scheduledOn ? (
                  <>
                    <time dateTime={item.scheduledOn}>
                      {formatDay(item.scheduledOn, dateLocale)}
                    </time>
                    <span aria-hidden="true"> · </span>
                    {placeLine(item, t)}
                  </>
                ) : (
                  placeLine(item, t)
                )}
              </span>
            </span>
            <MeetingStatusBadge status={item.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
