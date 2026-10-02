import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ackSchema, currentUserResponseSchema } from '@thesispartner/validation';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiSend } from '../api/client';

export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet('/api/v1/auth/me', currentUserResponseSchema),
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
