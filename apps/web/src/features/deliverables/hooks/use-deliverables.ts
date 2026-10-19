import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deliverableListItemSchema,
  deliverableListSchema,
  deliverableSchema,
  deliverableVersionListSchema,
  deliverableVersionSchema,
  fileDownloadSchema,
  storedFileSchema,
  type createDeliverableSchema,
  type createDeliverableVersionSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend, apiUpload } from '../../../api/client';
import { deliverableKeys, toQuery, type DeliverableFilters } from '../keys';

export type Deliverable = z.infer<typeof deliverableSchema>;
export type DeliverableListItem = z.infer<typeof deliverableListItemSchema>;
export type DeliverableDraft = z.infer<typeof createDeliverableSchema>;
export type DeliverableVersion = z.infer<typeof deliverableVersionSchema>;
export type DeliverableVersionDraft = z.infer<typeof createDeliverableVersionSchema>;

function base(thesisId: string, deliverableId?: string): string {
  const path = `/api/v1/theses/${thesisId}/deliverables`;
  return deliverableId ? `${path}/${deliverableId}` : path;
}

function refresh(
  queryClient: ReturnType<typeof useQueryClient>,
  thesisId: string,
  deliverableId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['deliverables', 'list', thesisId] }),
    ...(deliverableId
      ? [
          queryClient.invalidateQueries({
            queryKey: deliverableKeys.detail(thesisId, deliverableId),
          }),
        ]
      : []),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['supervision'] }),
    queryClient.invalidateQueries({ queryKey: ['objectives', 'detail', thesisId] }),
  ]);
}

export function useDeliverables(thesisId: string | null, filters: DeliverableFilters) {
  return useQuery({
    queryKey: deliverableKeys.list(thesisId ?? 'none', filters),
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(`${base(thesisId!)}${toQuery(filters)}`, deliverableListSchema),
  });
}

export function useDeliverable(thesisId: string | null, deliverableId: string | null) {
  return useQuery({
    queryKey: deliverableKeys.detail(thesisId ?? 'none', deliverableId ?? 'none'),
    enabled: Boolean(thesisId && deliverableId),
    queryFn: () => apiGet(base(thesisId!, deliverableId!), deliverableSchema),
  });
}

export function useCreateDeliverable(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverableDraft) => apiSend(base(thesisId), deliverableSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useUpdateDeliverable(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverableDraft) =>
      apiSend(base(thesisId, deliverableId), deliverableSchema, body, 'PATCH'),
    onSuccess: () => refresh(queryClient, thesisId, deliverableId),
  });
}

export function useCancelDeliverable(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend(base(thesisId, deliverableId), deliverableSchema, { status: 'CANCELLED' }, 'PATCH'),
    onSuccess: () => refresh(queryClient, thesisId, deliverableId),
  });
}

export function useSubmitDeliverable(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend(`${base(thesisId, deliverableId)}/submit`, deliverableSchema, {}),
    onSuccess: () => refresh(queryClient, thesisId, deliverableId),
  });
}

export function useRequestDeliverableChanges(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiSend(
        `${base(thesisId, deliverableId)}/request-changes`,
        deliverableSchema,
        message.trim() ? { message: message.trim() } : {},
      ),
    onSuccess: () => refresh(queryClient, thesisId, deliverableId),
  });
}

export function useApproveDeliverable(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend(`${base(thesisId, deliverableId)}/approve`, deliverableSchema, {}),
    onSuccess: () => refresh(queryClient, thesisId, deliverableId),
  });
}

export function useDeliverableVersions(thesisId: string | null, deliverableId: string | null) {
  return useQuery({
    queryKey: deliverableKeys.versions(thesisId ?? 'none', deliverableId ?? 'none'),
    enabled: Boolean(thesisId && deliverableId),
    queryFn: () =>
      apiGet(`${base(thesisId!, deliverableId!)}/versions`, deliverableVersionListSchema),
  });
}

export function useDeliverableVersion(
  thesisId: string | null,
  deliverableId: string | null,
  versionId: string | null,
) {
  return useQuery({
    queryKey: deliverableKeys.version(
      thesisId ?? 'none',
      deliverableId ?? 'none',
      versionId ?? 'none',
    ),
    enabled: Boolean(thesisId && deliverableId && versionId),
    queryFn: () =>
      apiGet(`${base(thesisId!, deliverableId!)}/versions/${versionId}`, deliverableVersionSchema),
  });
}

export function useCreateDeliverableVersion(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeliverableVersionDraft) =>
      apiSend(`${base(thesisId, deliverableId)}/versions`, deliverableVersionSchema, body),
    onSuccess: (created) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.versions(thesisId, deliverableId),
        }),
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.version(thesisId, deliverableId, created.id),
        }),
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.detail(thesisId, deliverableId),
        }),
        queryClient.invalidateQueries({ queryKey: ['deliverables', 'list', thesisId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  });
}

export function useUploadDeliverableFile(thesisId: string, deliverableId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      versionId: string;
      file: File;
      onProgress?: (loaded: number, total: number) => void;
    }) =>
      apiUpload(
        `${base(thesisId, deliverableId)}/versions/${input.versionId}/file`,
        storedFileSchema,
        input.file,
        input.onProgress,
      ),
    onSuccess: (_file, input) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.versions(thesisId, deliverableId),
        }),
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.version(thesisId, deliverableId, input.versionId),
        }),
        queryClient.invalidateQueries({
          queryKey: deliverableKeys.detail(thesisId, deliverableId),
        }),
        queryClient.invalidateQueries({ queryKey: ['deliverables', 'list', thesisId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]),
  });
}

export function useDeliverableFilePreview(
  thesisId: string,
  deliverableId: string,
  versionId: string | null,
) {
  return useQuery({
    queryKey: [...deliverableKeys.version(thesisId, deliverableId, versionId ?? 'none'), 'preview'],
    enabled: Boolean(versionId),
    retry: false,
    staleTime: 4 * 60 * 1000,
    queryFn: () =>
      apiGet(
        `${base(thesisId, deliverableId)}/versions/${versionId}/file/download?inline=1`,
        fileDownloadSchema,
      ),
  });
}

export function useDownloadDeliverableFile(thesisId: string, deliverableId: string) {
  return useMutation({
    mutationFn: (versionId: string) =>
      apiGet(
        `${base(thesisId, deliverableId)}/versions/${versionId}/file/download`,
        fileDownloadSchema,
      ),
    onSuccess: (download) => {
      const anchor = document.createElement('a');
      anchor.href = download.url;
      anchor.rel = 'noopener';
      anchor.click();
    },
  });
}
