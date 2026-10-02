export const REMARK_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type RemarkStatus = (typeof REMARK_STATUSES)[number];

export const REMARK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RemarkPriority = (typeof REMARK_PRIORITIES)[number];

export function sortRemarks<
  T extends { status: RemarkStatus; updatedAt: Date; createdAt: Date },
>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const byStatus = statusGroup(left.status) - statusGroup(right.status);
    if (byStatus !== 0) return byStatus;
    const updated = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (updated !== 0) return updated;
    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

function statusGroup(status: RemarkStatus): number {
  if (status === 'OPEN') return 0;
  if (status === 'IN_PROGRESS') return 1;
  if (status === 'RESOLVED') return 2;
  return 3;
}
