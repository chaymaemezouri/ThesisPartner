import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  remarkListSchema,
  remarkSchema,
  type createRemarkReplySchema,
  type createRemarkSchema,
  type resolveRemarkSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend, apiUpload } from '../../../api/client';
import { remarkKeys, toQuery, type RemarkFilters } from '../keys';

export type Remark = z.infer<typeof remarkSchema>;
export type RemarkListItem = z.infer<typeof remarkListSchema>['remarks'][number];
export type RemarkStatus = RemarkListItem['status'];
export type RemarkPriority = RemarkListItem['priority'];
export type RemarkDraft = z.infer<typeof createRemarkSchema>;
export type RemarkReplyDraft = z.infer<typeof createRemarkReplySchema>;
export type RemarkResolveDraft = z.infer<typeof resolveRemarkSchema>;

function base(thesisId: string, remarkId?: string): string {
  const path = `/api/v1/theses/${thesisId}/remarks`;
  return remarkId ? `${path}/${remarkId}` : path;
}

function refresh(
  queryClient: ReturnType<typeof useQueryClient>,
  thesisId: string,
  remarkId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['remarks', 'list', thesisId] }),
    ...(remarkId
      ? [queryClient.invalidateQueries({ queryKey: remarkKeys.detail(thesisId, remarkId) })]
      : []),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
}

export function useRemarks(thesisId: string | null, filters: RemarkFilters) {
  return useQuery({
    queryKey: remarkKeys.list(thesisId ?? 'none', filters),
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(`${base(thesisId!)}${toQuery(filters)}`, remarkListSchema),
  });
}

export function useRemark(thesisId: string | null, remarkId: string | null) {
  return useQuery({
    queryKey: remarkKeys.detail(thesisId ?? 'none', remarkId ?? 'none'),
    enabled: Boolean(thesisId && remarkId),
    queryFn: () => apiGet(base(thesisId!, remarkId!), remarkSchema),
  });
}

export function useCreateRemark(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RemarkDraft) => apiSend(base(thesisId), remarkSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useCreateVoiceRemark(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RemarkDraft & { file: File; durationMs: number }) =>
      apiUpload(`${base(thesisId)}/voice`, remarkSchema, input.file, undefined, {
        title: input.title,
        message: input.message,
        location: input.location ?? '',
        objectiveId: input.objectiveId ?? '',
        taskId: input.taskId ?? '',
        deliverableId: input.deliverableId ?? '',
        deliverableVersionId: input.deliverableVersionId ?? '',
        durationMs: String(Math.round(input.durationMs)),
      }),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useReplyRemark(thesisId: string, remarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RemarkReplyDraft) =>
      apiSend(`${base(thesisId, remarkId)}/replies`, remarkSchema, body),
    onSuccess: () => refresh(queryClient, thesisId, remarkId),
  });
}

export function useReplyVoiceRemark(thesisId: string, remarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { message?: string; file: File; durationMs: number }) =>
      apiUpload(`${base(thesisId, remarkId)}/replies/voice`, remarkSchema, input.file, undefined, {
        message: input.message ?? '',
        durationMs: String(Math.round(input.durationMs)),
      }),
    onSuccess: () => refresh(queryClient, thesisId, remarkId),
  });
}

export function useResolveRemark(thesisId: string, remarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RemarkResolveDraft = {}) =>
      apiSend(`${base(thesisId, remarkId)}/resolve`, remarkSchema, body),
    onSuccess: () => refresh(queryClient, thesisId, remarkId),
  });
}

export function useCloseRemark(thesisId: string, remarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend(`${base(thesisId, remarkId)}/close`, remarkSchema, {}),
    onSuccess: () => refresh(queryClient, thesisId, remarkId),
  });
}

export function useReopenRemark(thesisId: string, remarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend(`${base(thesisId, remarkId)}/reopen`, remarkSchema, {}),
    onSuccess: () => refresh(queryClient, thesisId, remarkId),
  });
}
