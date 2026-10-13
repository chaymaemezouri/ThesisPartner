import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  conversationDetailSchema,
  conversationListSchema,
  type createMessageGroupSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend } from '../../../api/client';

export type ConversationList = z.infer<typeof conversationListSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
export type ConversationSummary = ConversationList['conversations'][number];
export type GroupDraft = z.infer<typeof createMessageGroupSchema>;

const listKey = ['messages', 'list'] as const;

export function messageDetailKey(conversationId: string) {
  return ['messages', 'detail', conversationId] as const;
}

export function useConversations() {
  return useQuery({
    queryKey: listKey,
    queryFn: () => apiGet('/api/v1/messages/conversations', conversationListSchema),
    refetchInterval: 15_000,
  });
}

export function useConversation(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: conversationId ? messageDetailKey(conversationId) : ['messages', 'detail', 'none'],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const detail = await apiGet(
        `/api/v1/messages/conversations/${conversationId}`,
        conversationDetailSchema,
      );
      void queryClient.invalidateQueries({ queryKey: listKey });
      return detail;
    },
    refetchInterval: 15_000,
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiSend(
        `/api/v1/messages/conversations/${conversationId}/messages`,
        conversationDetailSchema,
        { body },
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(messageDetailKey(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupDraft) =>
      apiSend('/api/v1/messages/conversations/groups', conversationDetailSchema, body),
    onSuccess: (detail) => {
      queryClient.setQueryData(messageDetailKey(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useUpdateGroup(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupDraft) =>
      apiSend(
        `/api/v1/messages/conversations/${conversationId}/members`,
        conversationDetailSchema,
        body,
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(messageDetailKey(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
