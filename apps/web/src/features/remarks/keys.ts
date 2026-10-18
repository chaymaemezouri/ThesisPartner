export type RemarkFilters = {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  search?: string;
};

export const remarkKeys = {
  list: (thesisId: string, filters: RemarkFilters) =>
    ['remarks', 'list', thesisId, filters] as const,
  detail: (thesisId: string, remarkId: string) =>
    ['remarks', 'detail', thesisId, remarkId] as const,
};

export function filtersFromSearch(params: URLSearchParams): RemarkFilters {
  const status = params.get('status');
  const priority = params.get('priority');
  const search = params.get('search')?.trim();
  return {
    status:
      status === 'OPEN' || status === 'IN_PROGRESS' || status === 'RESOLVED' || status === 'CLOSED'
        ? status
        : undefined,
    priority:
      priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH' ? priority : undefined,
    search: search || undefined,
  };
}

export function toQuery(filters: RemarkFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.search) params.set('search', filters.search);
  const query = params.toString();
  return query ? `?${query}` : '';
}
