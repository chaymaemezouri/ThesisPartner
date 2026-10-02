export type ObjectiveFilters = {
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  search?: string;
  overdue?: boolean;
};

export const objectiveKeys = {
  all: ['objectives'] as const,
  list: (thesisId: string, filters: ObjectiveFilters) =>
    ['objectives', 'list', thesisId, filters] as const,
  detail: (thesisId: string, objectiveId: string) =>
    ['objectives', 'detail', thesisId, objectiveId] as const,
  tasks: (thesisId: string, objectiveId: string) =>
    ['objectives', 'tasks', thesisId, objectiveId] as const,
};

export function filtersFromTab(tab: string, search: string): ObjectiveFilters {
  const filters: ObjectiveFilters = {};
  if (tab === 'overdue') filters.overdue = true;
  if (tab === 'PLANNED' || tab === 'IN_PROGRESS' || tab === 'COMPLETED') filters.status = tab;
  const trimmed = search.trim();
  if (trimmed) filters.search = trimmed;
  return filters;
}

export function toQuery(filters: ObjectiveFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.overdue) params.set('overdue', 'true');
  const text = params.toString();
  return text ? `?${text}` : '';
}
