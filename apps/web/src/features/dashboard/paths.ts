import type { DashboardData } from './labels';

type Deadline = DashboardData['upcomingDeadlines'][number];

export function deadlinePath(item: Deadline): string {
  if (item.kind === 'OBJECTIVE') return `/objectifs/${item.id}`;
  if (item.kind === 'DELIVERABLE') return `/livrables/${item.id}`;
  if (item.kind === 'EXPECTED_DEFENSE') return '/profil';
  return '/objectifs';
}

export function activityPath(type: DashboardData['recentActivity'][number]['type']): string {
  if (type.startsWith('DELIVERABLE')) return '/livrables';
  if (type.startsWith('OBJECTIVE') || type.startsWith('TASK')) return '/objectifs';
  return '/profil';
}

/** English fallbacks. Prefer `t('dashboard.kind.*')` in UI. */
export const DEADLINE_KIND = {
  EXPECTED_DEFENSE: 'Defense',
  OBJECTIVE: 'Objective',
  TASK: 'Task',
  DELIVERABLE: 'Deliverable',
} as const;
