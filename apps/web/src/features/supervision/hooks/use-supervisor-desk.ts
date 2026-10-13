import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  publicationStatusSchema,
  supervisorDeskSchema,
  type evaluationInputSchema,
} from '@thesispartner/validation';
import { z } from 'zod';
import { apiGet, apiSend } from '../../../api/client';

export type SupervisorDesk = z.infer<typeof supervisorDeskSchema>;
export type EvaluationDraft = z.infer<typeof evaluationInputSchema>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

const createdSchema = z.object({ id: z.string().uuid() }).strict();
const statusResultSchema = z
  .object({ id: z.string().uuid(), status: publicationStatusSchema })
  .strict();

export function useSupervisorDesk() {
  return useQuery({
    queryKey: ['supervision', 'desk'],
    queryFn: () => apiGet('/api/v1/supervision/desk', supervisorDeskSchema),
  });
}

function refreshDesk(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['supervision', 'desk'] });
}

export function useRecordEvaluation(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EvaluationDraft) =>
      apiSend(`/api/v1/supervision/desk/theses/${thesisId}/evaluations`, createdSchema, body),
    onSuccess: () => refreshDesk(queryClient),
  });
}

export function usePublicationStatus(publicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PublicationStatus) =>
      apiSend(
        `/api/v1/supervision/desk/publications/${publicationId}/status`,
        statusResultSchema,
        { status },
      ),
    onSuccess: () => refreshDesk(queryClient),
  });
}
