import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ackSchema, currentUserResponseSchema } from '@thesispartner/validation';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiSend, ApiClientError } from '../api/client';

export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet('/api/v1/auth/me', currentUserResponseSchema),
    retry: (attempt, error) =>
      attempt < 2 &&
      (error instanceof TypeError ||
        (error instanceof ApiClientError && error.body.statusCode >= 500)),
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    refetchOnWindowFocus: true,
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend('/api/v1/auth/logout', ackSchema, {}),
    onSuccess: async () => {
      queryClient.clear();
      await navigate('/connexion');
    },
  });
}

export function useRequestEmailVerification() {
  return useMutation({
    mutationFn: () => apiSend('/api/v1/auth/email-verification/request', ackSchema, {}),
  });
}
