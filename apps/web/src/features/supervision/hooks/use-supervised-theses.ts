import { useQuery } from '@tanstack/react-query';
import { supervisedThesisListSchema } from '@thesispartner/validation';
import { apiGet } from '../../../api/client';
import { supervisionKeys } from '../keys';

export function useSupervisedTheses() {
  return useQuery({
    queryKey: supervisionKeys.theses,
    queryFn: () => apiGet('/api/v1/supervision/theses', supervisedThesisListSchema),
  });
}
