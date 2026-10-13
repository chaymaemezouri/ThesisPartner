export const MEETING_STATUSES = ['REQUESTED', 'PLANNED', 'HELD', 'CANCELLED'] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export function splitMeetings<T extends { status: MeetingStatus; scheduledOn: string | null }>(
  items: readonly T[],
  today: string,
): { upcoming: T[]; history: T[] } {
  const upcoming = items
    .filter(
      (item) =>
        item.status === 'REQUESTED' ||
        (item.status === 'PLANNED' && item.scheduledOn !== null && item.scheduledOn >= today),
    )
    .sort((left, right) => compareDay(left.scheduledOn, right.scheduledOn));
  const history = items
    .filter((item) => !upcoming.includes(item))
    .sort((left, right) => compareDayDesc(left.scheduledOn, right.scheduledOn));
  return { upcoming, history };
}

function compareDayDesc(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.localeCompare(left);
}

function compareDay(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return left.localeCompare(right);
}
