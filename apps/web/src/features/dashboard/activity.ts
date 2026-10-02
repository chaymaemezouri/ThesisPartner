import type { MessageKey } from '../../i18n/translate';
import { formatMessage, getMessage } from '../../i18n/translate';
import { en } from '../../i18n/messages/en';
import type { DashboardData } from './labels';
import { ACTIVITY_LABEL } from './labels';

type Activity = DashboardData['recentActivity'][number];
type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function defaultT(key: MessageKey, params?: Record<string, string | number>): string {
  return formatMessage(getMessage(en, key), params);
}

export type ActivityLine = {
  date: string;
  text: string;
  type: Activity['type'];
};

export function groupActivity(
  items: readonly Activity[],
  today: string,
  labelOf: (type: Activity['type']) => string = (type) => ACTIVITY_LABEL[type],
  t: Translate = defaultT,
): ActivityLine[] {
  const groups: {
    key: string;
    date: string;
    text: string;
    count: number;
    type: Activity['type'];
  }[] = [];
  for (const item of items) {
    if (item.type === 'PROFILE_UPDATED') continue;
    const date = item.occurredAt.slice(0, 10);
    const text = item.message ?? labelOf(item.type);
    const key = `${date}|${item.type}|${item.message ?? ''}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.count += 1;
    else groups.push({ key, date, text, count: 1, type: item.type });
  }
  return groups.slice(0, 5).map((group) => ({
    date: group.date,
    type: group.type,
    text:
      group.count === 1
        ? group.text
        : group.date === today
          ? t('dashboard.modificationsToday', { count: group.count })
          : t('dashboard.modifications', { count: group.count }),
  }));
}
