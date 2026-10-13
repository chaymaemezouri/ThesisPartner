export type RosterFilter = 'all' | 'on_track' | 'attention' | 'late' | 'pending';
export type RosterSort = 'name' | 'progress-desc' | 'progress-asc';

export type RosterThesis = {
  thesisId: string;
  title: string;
  progressPercentage: number;
  pendingValidationCount: number;
  doctoralStudent: { givenName: string; familyName: string } | null;
  objectiveSummary: { inProgress: number; overdue: number };
};

export type RosterStats = {
  students: number;
  averageProgress: number;
  inProgress: number;
  overdue: number;
  pending: number;
};

export function rosterStats(theses: readonly RosterThesis[]): RosterStats {
  const students = theses.length;
  const averageProgress =
    students === 0
      ? 0
      : Math.round(theses.reduce((total, item) => total + item.progressPercentage, 0) / students);
  return {
    students,
    averageProgress,
    inProgress: theses.reduce((total, item) => total + item.objectiveSummary.inProgress, 0),
    overdue: theses.reduce((total, item) => total + item.objectiveSummary.overdue, 0),
    pending: theses.reduce((total, item) => total + item.pendingValidationCount, 0),
  };
}

export function studentName(thesis: RosterThesis, fallback: string): string {
  const person = thesis.doctoralStudent;
  if (!person) return fallback;
  return `${person.givenName} ${person.familyName}`.trim() || fallback;
}

export function matchesRoster(
  thesis: RosterThesis,
  query: string,
  filter: RosterFilter,
  fallback: string,
): boolean {
  const name = studentName(thesis, fallback).toLocaleLowerCase();
  const title = thesis.title.toLocaleLowerCase();
  const needle = query.trim().toLocaleLowerCase();
  if (needle && !name.includes(needle) && !title.includes(needle)) return false;
  if (filter === 'late') return thesis.objectiveSummary.overdue > 0;
  if (filter === 'pending') return thesis.pendingValidationCount > 0;
  if (filter === 'attention') {
    return thesis.objectiveSummary.overdue === 0 && thesis.progressPercentage < 50;
  }
  if (filter === 'on_track') {
    return thesis.objectiveSummary.overdue === 0 && thesis.progressPercentage >= 50;
  }
  return true;
}

export function sortRoster<T extends RosterThesis>(
  theses: readonly T[],
  sort: RosterSort,
  fallback: string,
): T[] {
  return [...theses].sort((left, right) => {
    if (sort === 'progress-desc') return right.progressPercentage - left.progressPercentage;
    if (sort === 'progress-asc') return left.progressPercentage - right.progressPercentage;
    return studentName(left, fallback).localeCompare(studentName(right, fallback));
  });
}
