import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  invitationListSchema,
  invitationPreviewSchema,
  invitationSummarySchema,
  inviteMemberSchema,
  inviteResponseSchema,
  supervisorChangeBodySchema,
} from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';

export function useThesisInvitations(thesisId: string | undefined) {
  return useQuery({
    queryKey: ['invitations', 'thesis', thesisId],
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}/invitations`, invitationListSchema),
    enabled: Boolean(thesisId),
  });
}

export function useInvitationInbox() {
  return useQuery({
    queryKey: ['invitations', 'inbox'],
    queryFn: () => apiGet('/api/v1/invitations/inbox', invitationListSchema),
  });
}

export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: ['invitations', 'preview', token],
    queryFn: () =>
      apiGet(
        `/api/v1/invitations/preview?token=${encodeURIComponent(token ?? '')}`,
        invitationPreviewSchema,
      ),
    enabled: Boolean(token && token.length >= 20),
    retry: false,
  });
}

export function useCreateInvitation(thesisId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: 'SUPERVISOR' | 'DOCTORAL_STUDENT' | 'ADMIN' }) =>
      apiSend(
        `/api/v1/theses/${thesisId}/invitations`,
        inviteResponseSchema,
        inviteMemberSchema.parse(body),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
      await client.invalidateQueries({ queryKey: ['theses', thesisId] });
    },
  });
}

export function useSupervisorChange(thesisId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; reason: string }) =>
      apiSend(
        `/api/v1/theses/${thesisId}/supervisor-change`,
        inviteResponseSchema,
        supervisorChangeBodySchema.parse(body),
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
      await client.invalidateQueries({ queryKey: ['theses', thesisId] });
    },
  });
}

export function useResendInvitation(thesisId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiSend(
        `/api/v1/theses/${thesisId}/invitations/${invitationId}/resend`,
        invitationSummarySchema,
        {},
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useCancelInvitation(thesisId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiSend(
        `/api/v1/theses/${thesisId}/invitations/${invitationId}/cancel`,
        invitationSummarySchema,
        {},
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useRespondInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { token: string; action: 'accept' | 'reject' }) =>
      apiSend(`/api/v1/invitations/${input.action}`, invitationSummarySchema, {
        token: input.token,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['invitations'] });
      await client.invalidateQueries({ queryKey: ['theses'] });
      await client.invalidateQueries({ queryKey: ['supervision'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
