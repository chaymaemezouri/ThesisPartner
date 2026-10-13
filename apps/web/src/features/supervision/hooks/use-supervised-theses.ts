import { useQuery } from '@tanstack/react-query';
import { supervisedSpaceSchema, supervisedThesisListSchema } from '@thesispartner/validation';
import { apiGet } from '../../../api/client';
import { supervisionKeys } from '../keys';

export function useSupervisedTheses() {
  return useQuery({
    queryKey: supervisionKeys.theses,
    queryFn: () => apiGet('/api/v1/supervision/theses', supervisedThesisListSchema),
  });
}

export function useStudentSpace(thesisId: string) {
  return useQuery({
    queryKey: [...supervisionKeys.theses, thesisId, 'space'],
    queryFn: () => apiGet(`/api/v1/supervision/theses/${thesisId}`, supervisedSpaceSchema),
    enabled: thesisId.length > 0,
  });
}
