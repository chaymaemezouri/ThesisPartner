import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import type { Meeting } from '../hooks/use-meetings';

const DOT = {
  REQUESTED: 'bg-warn',
  PLANNED: 'bg-brand',
  HELD: 'bg-ok',
  CANCELLED: 'bg-muted',
} as const;

export function MeetingCalendar({
  meetings,
  detailPath,
}: {
  meetings: Meeting[];
  detailPath: (meetingId: string) => string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const dated = useMemo(
    () =>
      meetings.filter((meeting): meeting is Meeting & { scheduledOn: string } =>
        Boolean(meeting.scheduledOn),
      ),
    [meetings],
  );
  const byDay = useMemo(() => {
    const grouped = new Map<string, Meeting[]>();
    for (const meeting of dated) {
      const day = grouped.get(meeting.scheduledOn) ?? [];
      day.push(meeting);
      grouped.set(meeting.scheduledOn, day);
    }
    return grouped;
  }, [dated]);
  const [cursor, setCursor] = useState(() => openingMonth(dated));
  const [selected, setSelected] = useState<string | null>(null);
  const cells = monthCells(cursor.year, cursor.month);
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(
    dateLocale,
    {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    },
  );
  const weekdays = weekdayLabels(dateLocale);
  const today = new Date().toISOString().slice(0, 10);
  const selectedMeetings = selected ? (byDay.get(selected) ?? []) : [];
  const usedStatuses = new Set(dated.map((meeting) => meeting.status));

  return (
    <section
      className="w-full max-w-[20rem] rounded-md border border-line bg-surface lg:sticky lg:top-4 lg:max-w-none"
      aria-labelledby="meetings-calendar"
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 id="meetings-calendar" className="text-sm font-semibold capitalize text-ink">
          {monthLabel}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink hover:bg-canvas"
            aria-label={t('meetings.previousMonth')}
            onClick={() => setCursor((current) => shiftMonth(current, -1))}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink hover:bg-canvas"
            aria-label={t('meetings.nextMonth')}
            onClick={() => setCursor((current) => shiftMonth(current, 1))}
          >
            <Chevron direction="right" />
          </button>
        </div>
      </header>
      <div className="px-2 py-2">
        <div className="grid grid-cols-7" aria-hidden="true">
          {weekdays.map((label, index) => (
            <span
              key={index}
              className="py-1 text-center text-[10px] font-medium text-muted uppercase"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7" role="group" aria-label={t('meetings.calendarAria')}>
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="h-9" />;
            const dayMeetings = byDay.get(day) ?? [];
            const isSelected = selected === day;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={isSelected}
                aria-label={dayLabel(day, dayMeetings, dateLocale)}
                className={
                  isSelected
                    ? 'flex h-9 flex-col items-center justify-center rounded-md bg-brand-soft text-[11px] font-medium text-brand'
                    : isToday
                      ? 'flex h-9 flex-col items-center justify-center rounded-md text-[11px] font-semibold text-brand hover:bg-canvas'
                      : 'flex h-9 flex-col items-center justify-center rounded-md text-[11px] text-ink hover:bg-canvas'
                }
                onClick={() => setSelected(day)}
              >
                <span>{Number(day.slice(8))}</span>
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <span
                      key={meeting.id}
                      className={`h-1.5 w-1.5 rounded-full ${DOT[meeting.status]}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        {usedStatuses.size > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-1 pt-2">
            {(['PLANNED', 'REQUESTED', 'HELD', 'CANCELLED'] as const)
              .filter((status) => usedStatuses.has(status))
              .map((status) => (
                <li key={status} className="flex items-center gap-1 text-[10px] text-muted">
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
                  {t(`meetings.statusLabel.${status}`)}
                </li>
              ))}
          </ul>
        ) : null}
        {selected ? (
          <div className="mt-2 border-t border-line px-1 pt-2">
            <p className="text-[11px] font-medium text-ink">
              {new Date(`${selected}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
                day: 'numeric',
                month: 'long',
                timeZone: 'UTC',
              })}
            </p>
            {selectedMeetings.length === 0 ? (
              <p className="mt-1 text-[11px] text-muted">{t('meetings.noSessionDay')}</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {selectedMeetings.map((meeting) => (
                  <li key={meeting.id}>
                    <Link
                      to={detailPath(meeting.id)}
                      className="block truncate text-[11px] text-brand hover:underline"
                    >
                      {meeting.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function openingMonth(meetings: Array<Meeting & { scheduledOn: string }>): {
  year: number;
  month: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = meetings
    .map((meeting) => meeting.scheduledOn)
    .filter((day) => day >= today)
    .sort();
  const anchor =
    upcoming[0] ??
    meetings
      .map((meeting) => meeting.scheduledOn)
      .sort()
      .at(-1) ??
    today;
  return { year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 };
}

function shiftMonth(cursor: { year: number; month: number }, delta: number) {
  const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}

function monthCells(year: number, month: number): Array<string | null> {
  const first = new Date(Date.UTC(year, month, 1));
  const leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weekdayLabels(locale: string): string[] {
  const monday = new Date(Date.UTC(2026, 0, 5));
  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday.getTime() + index * 86_400_000)
      .toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
      .replace('.', '')
      .slice(0, 2),
  );
}

function dayLabel(day: string, meetings: Meeting[], locale: string): string {
  const formatted = new Date(`${day}T00:00:00.000Z`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (meetings.length === 0) return formatted;
  return `${formatted}. ${meetings.map((meeting) => meeting.title).join(', ')}`;
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
