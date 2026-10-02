import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema } from '@thesispartner/validation';
import { apiGet } from '../api/client';

export function useHealthQuery() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet('/api/v1/health', healthResponseSchema),
  });
}
