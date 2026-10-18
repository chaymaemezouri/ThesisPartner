import type { MessageKey } from '../../i18n/translate';
import { formatMessage, getMessage } from '../../i18n/translate';
import { en } from '../../i18n/messages/en';

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function defaultT(key: MessageKey, params?: Record<string, string | number>): string {
  return formatMessage(getMessage(en, key), params);
}

export function computeProgressStatus(overdueObjectives: number, t: Translate = defaultT): string {
  if (overdueObjectives > 0) {
    return overdueObjectives === 1
      ? t('dashboard.lateOneObjective')
      : t('dashboard.lateManyObjectives', { count: overdueObjectives });
  }
  return t('dashboard.onTrackSchedule');
}
