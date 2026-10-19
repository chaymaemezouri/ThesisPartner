import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documentDeskSchema,
  fileDownloadSchema,
  thesisDocumentInputSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend, apiUpload } from '../../../api/client';

export type DocumentDesk = z.infer<typeof documentDeskSchema>;
export type ThesisDocument = DocumentDesk['documents'][number];
export type DocumentDraft = z.infer<typeof thesisDocumentInputSchema>;

function key(thesisId: string) {
  return ['thesis-documents', thesisId] as const;
}

export function useThesisDocuments(thesisId: string | null) {
  return useQuery({
    queryKey: key(thesisId ?? 'none'),
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}/documents`, documentDeskSchema),
  });
}

export function useThesisDocumentActions(thesisId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: key(thesisId) });
  const base = `/api/v1/theses/${thesisId}/documents`;
  return {
    create: useMutation({
      mutationFn: (body: DocumentDraft) => apiSend(base, documentDeskSchema, body),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (input: { id: string; body: DocumentDraft }) =>
        apiSend(`${base}/${input.id}`, documentDeskSchema, input.body, 'PATCH'),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiSend(`${base}/${id}`, documentDeskSchema, {}, 'DELETE'),
      onSuccess: refresh,
    }),
    upload: useMutation({
      mutationFn: (input: { id: string; file: File }) =>
        apiUpload(`${base}/${input.id}/file`, documentDeskSchema, input.file),
      onSuccess: refresh,
    }),
    consult: useMutation({
      mutationFn: (id: string) => apiSend(`${base}/${id}/consult`, documentDeskSchema, {}),
      onSuccess: refresh,
    }),
    synthesis: useMutation({
      mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
        apiSend(`${base}/${input.id}/synthesis`, documentDeskSchema, input.body),
      onSuccess: refresh,
    }),
    review: useMutation({
      mutationFn: (input: {
        id: string;
        decision: 'VALIDATED' | 'CHANGES_REQUESTED';
        message?: string;
      }) =>
        apiSend(`${base}/${input.id}/review`, documentDeskSchema, {
          decision: input.decision,
          message: input.message,
        }),
      onSuccess: refresh,
    }),
    openFile: async (id: string, inline: boolean) => {
      const download = await apiGet(
        `${base}/${id}/file${inline ? '?inline=1' : ''}`,
        fileDownloadSchema,
      );
      window.open(download.url, '_blank', 'noopener');
    },
  };
}
