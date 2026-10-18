import type { dashboardSchema } from '@thesispartner/validation';
import type { z } from 'zod';

export type DashboardData = z.output<typeof dashboardSchema>;

/** English fallbacks. Prefer `t('progressStatus.*')` / `t('activity.*')` / `t('dashboard.*')` in UI. */
export const PROGRESS_LABEL = {
  NOT_STARTED: 'Not started',
  ON_TRACK: 'On track',
  ATTENTION: 'Needs attention',
  AT_RISK: 'At risk',
} as const;

export const KPI_LABEL = {
  progress: 'Progress',
  profile: 'Profile completed',
  members: 'Members',
  tenure: 'Tenure',
} as const;

export const ACTIVITY_LABEL = {
  THESIS_CREATED: 'Thesis created',
  MEMBER_ADDED: 'Member added',
  PROFILE_UPDATED: 'Profile updated',
  THESIS_UPDATED: 'Thesis updated',
  OBJECTIVE_CREATED: 'Objective created',
  OBJECTIVE_UPDATED: 'Objective updated',
  OBJECTIVE_COMPLETED: 'Objective completed',
  TASK_CREATED: 'Task added',
  TASK_STARTED: 'Task started',
  TASK_COMPLETED: 'Task completed',
  TASK_CANCELLED: 'Task cancelled',
  OBJECTIVE_COMPLETION_REQUESTED: 'Validation requested',
  OBJECTIVE_COMPLETION_APPROVED: 'Objective validated',
  OBJECTIVE_CHANGES_REQUESTED: 'Changes requested',
  DELIVERABLE_CREATED: 'Deliverable created',
  DELIVERABLE_UPDATED: 'Deliverable updated',
  DELIVERABLE_CANCELLED: 'Deliverable cancelled',
  DELIVERABLE_OBJECTIVE_LINKED: 'Deliverable linked to an objective',
  DELIVERABLE_VERSION_CREATED: 'New version added',
  DELIVERABLE_FILE_UPLOADED: 'File added to a version',
  DELIVERABLE_SUBMITTED: 'Deliverable submitted',
  DELIVERABLE_CHANGES_REQUESTED: 'Changes requested on a deliverable',
  DELIVERABLE_VALIDATED: 'Deliverable validated',
  REMARK_CREATED: 'Remark added',
  REMARK_REPLIED: 'Reply to a remark',
  REMARK_RESOLVED: 'Remark marked corrected',
  REMARK_REOPENED: 'Remark reopened',
  REMARK_CLOSED: 'Remark closed',
} as const;

export const THESIS_STATUS_LABEL = {
  ACTIVE: 'In progress',
  SUSPENDED: 'Suspended',
  COMPLETED: 'Defended',
  ABANDONED: 'Abandoned',
} as const;

export const MISSING_FIELD_LABEL: Record<string, string> = {
  givenName: 'first name',
  familyName: 'last name',
  institution: 'university',
  laboratory: 'laboratory',
  specialty: 'specialty',
  avatarUrl: 'photo',
  orcid: 'ORCID',
};

export function formatDay(value: string, locale = 'en-US'): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, { timeZone: 'UTC' });
}

export function formatShortDay(value: string, locale = 'en-US'): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function kpiValue(id: DashboardData['kpis'][number]['id'], value: string): string {
  if (id === 'progress' || id === 'profile') return `${value} %`;
  if (id === 'tenure') return `${value} d`;
  return value;
}
