import { useQuery } from '@tanstack/react-query';
import { dashboardSchema } from '@thesispartner/validation';
import { apiGet } from '../../../api/client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet('/api/v1/dashboard', dashboardSchema),
  });
}
