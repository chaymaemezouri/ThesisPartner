export const ACTIVITY_ACTIONS = [
  'thesis.create',
  'membership.create',
  'profile.update',
  'thesis.update',
  'objective.create',
  'objective.update',
  'objective.completed',
  'task.created',
  'task.started',
  'task.completed',
  'task.cancelled',
  'objective.completion_requested',
  'objective.completion_approved',
  'objective.changes_requested',
  'deliverable.created',
  'deliverable.updated',
  'deliverable.cancelled',
  'deliverable.objective_linked',
  'deliverable.version_created',
  'deliverable.file_uploaded',
  'deliverable.submitted',
  'deliverable.changes_requested',
  'deliverable.validated',
  'remark.created',
  'remark.replied',
  'remark.resolved',
  'remark.reopened',
  'remark.closed',
] as const;

const ACTIVITY_TYPES = {
  'thesis.create': 'THESIS_CREATED',
  'membership.create': 'MEMBER_ADDED',
  'profile.update': 'PROFILE_UPDATED',
  'thesis.update': 'THESIS_UPDATED',
  'objective.create': 'OBJECTIVE_CREATED',
  'objective.update': 'OBJECTIVE_UPDATED',
  'objective.completed': 'OBJECTIVE_COMPLETED',
  'task.created': 'TASK_CREATED',
  'task.started': 'TASK_STARTED',
  'task.completed': 'TASK_COMPLETED',
  'task.cancelled': 'TASK_CANCELLED',
  'objective.completion_requested': 'OBJECTIVE_COMPLETION_REQUESTED',
  'objective.completion_approved': 'OBJECTIVE_COMPLETION_APPROVED',
  'objective.changes_requested': 'OBJECTIVE_CHANGES_REQUESTED',
  'deliverable.created': 'DELIVERABLE_CREATED',
  'deliverable.updated': 'DELIVERABLE_UPDATED',
  'deliverable.cancelled': 'DELIVERABLE_CANCELLED',
  'deliverable.objective_linked': 'DELIVERABLE_OBJECTIVE_LINKED',
  'deliverable.version_created': 'DELIVERABLE_VERSION_CREATED',
  'deliverable.file_uploaded': 'DELIVERABLE_FILE_UPLOADED',
  'deliverable.submitted': 'DELIVERABLE_SUBMITTED',
  'deliverable.changes_requested': 'DELIVERABLE_CHANGES_REQUESTED',
  'deliverable.validated': 'DELIVERABLE_VALIDATED',
  'remark.created': 'REMARK_CREATED',
  'remark.replied': 'REMARK_REPLIED',
  'remark.resolved': 'REMARK_RESOLVED',
  'remark.reopened': 'REMARK_REOPENED',
  'remark.closed': 'REMARK_CLOSED',
} as const;

export function versionActivityMessage(versionNumber: number, title: string): string {
  return `Nouvelle version V${versionNumber} ajoutée à « ${title} »`;
}

export function fileActivityMessage(versionNumber: number, title: string): string {
  return `Un fichier a été ajouté à la version V${versionNumber} de « ${title} ».`;
}

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

export function toActivity(entry: { action: string; createdAt: Date }): {
  type: ActivityType;
  occurredAt: string;
} | null {
  const type = ACTIVITY_TYPES[entry.action as keyof typeof ACTIVITY_TYPES];
  if (!type) return null;
  return { type, occurredAt: entry.createdAt.toISOString() };
}
