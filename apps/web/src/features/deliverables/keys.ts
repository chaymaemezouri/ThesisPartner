export type DeliverableFilters = {
  status?: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'VALIDATED' | 'CANCELLED';
  type?:
    | 'ARTICLE'
    | 'THESIS_CHAPTER'
    | 'REPORT'
    | 'CODE'
    | 'DATASET'
    | 'PRESENTATION'
    | 'POSTER'
    | 'COMMUNICATION'
    | 'OTHER';
  objectiveId?: string;
  search?: string;
  sort?: 'due' | 'updated';
};

export const deliverableKeys = {
  all: ['deliverables'] as const,
  list: (thesisId: string, filters: DeliverableFilters) =>
    ['deliverables', 'list', thesisId, filters] as const,
  detail: (thesisId: string, deliverableId: string) =>
    ['deliverables', 'detail', thesisId, deliverableId] as const,
  versions: (thesisId: string, deliverableId: string) =>
    ['deliverables', 'versions', thesisId, deliverableId] as const,
  version: (thesisId: string, deliverableId: string, versionId: string) =>
    ['deliverables', 'version', thesisId, deliverableId, versionId] as const,
};

export function filtersFromSearch(params: URLSearchParams): DeliverableFilters {
  const filters: DeliverableFilters = {};
  const status = params.get('status');
  const type = params.get('type');
  const objectiveId = params.get('objectiveId');
  const search = params.get('search')?.trim();
  const sort = params.get('sort');
  if (
    status === 'DRAFT' ||
    status === 'SUBMITTED' ||
    status === 'CHANGES_REQUESTED' ||
    status === 'VALIDATED' ||
    status === 'CANCELLED'
  ) {
    filters.status = status;
  }
  if (
    type === 'ARTICLE' ||
    type === 'THESIS_CHAPTER' ||
    type === 'REPORT' ||
    type === 'CODE' ||
    type === 'DATASET' ||
    type === 'PRESENTATION' ||
    type === 'POSTER' ||
    type === 'COMMUNICATION' ||
    type === 'OTHER'
  ) {
    filters.type = type;
  }
  if (objectiveId) filters.objectiveId = objectiveId;
  if (search) filters.search = search;
  if (sort === 'due' || sort === 'updated') filters.sort = sort;
  return filters;
}

export function toQuery(filters: DeliverableFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.objectiveId) params.set('objectiveId', filters.objectiveId);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort) params.set('sort', filters.sort);
  const text = params.toString();
  return text ? `?${text}` : '';
}
