import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingActionBodySchema, onboardingStatusSchema } from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: () => apiGet('/api/v1/onboarding', onboardingStatusSchema),
    enabled,
    staleTime: 15_000,
  });
}

export function useOnboardingAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: 'dismiss_welcome' | 'complete_guide' | 'reopen_guide') =>
      apiSend(
        '/api/v1/onboarding/actions',
        onboardingStatusSchema,
        onboardingActionBodySchema.parse({ action }),
      ),
    onSuccess: async (data) => {
      client.setQueryData(['onboarding'], data);
    },
  });
}
