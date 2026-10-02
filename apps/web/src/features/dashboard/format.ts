import type { MessageKey } from '../../i18n/translate';
import { formatMessage, getMessage } from '../../i18n/translate';
import { en } from '../../i18n/messages/en';

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function defaultT(key: MessageKey, params?: Record<string, string | number>): string {
  return formatMessage(getMessage(en, key), params);
}

export function formatDate(value: string, locale = 'en-US'): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dayDiff(value: string, today = utcToday()): number {
  const [year, month, day] = value.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  if (!year || !month || !day || !todayYear || !todayMonth || !todayDay) return 0;
  const target = Date.UTC(year, month - 1, day);
  const current = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round((target - current) / 86_400_000);
}

export function relativeDays(
  value: string,
  today = utcToday(),
  t: Translate = defaultT,
): string {
  const diff = dayDiff(value, today);
  if (diff === 0) return t('dashboard.relativeToday');
  if (diff > 0) {
    return diff === 1
      ? t('dashboard.relativeInOne')
      : t('dashboard.relativeInMany', { count: diff });
  }
  const late = -diff;
  return late === 1
    ? t('dashboard.relativeLateOne')
    : t('dashboard.relativeLateMany', { count: late });
}

export function lateDaysShort(
  value: string,
  today = utcToday(),
  t: Translate = defaultT,
): string {
  const late = Math.max(1, -dayDiff(value, today));
  return t('dashboard.lateShort', { count: late });
}

function inclusiveMonths(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) return 1;
  let months = (endYear - startYear) * 12 + (endMonth - startMonth);
  if (endDay < startDay) months -= 1;
  return Math.max(1, months + 1);
}

function yearLabel(year: number, t: Translate): string {
  return year === 1 ? t('dashboard.yearOne') : t('dashboard.yearMany', { count: year });
}

export function thesisCalendar(
  startedOn: string,
  expectedDefenseOn: string | null,
  today: string,
  t: Translate = defaultT,
): string {
  const month = inclusiveMonths(startedOn, today);
  const year = Math.floor((month - 1) / 12) + 1;
  if (!expectedDefenseOn) {
    return t('dashboard.calendarMonths', { year: yearLabel(year, t), month });
  }
  const total = inclusiveMonths(startedOn, expectedDefenseOn);
  return t('dashboard.calendarMonthsTotal', {
    year: yearLabel(year, t),
    month,
    total,
  });
}
