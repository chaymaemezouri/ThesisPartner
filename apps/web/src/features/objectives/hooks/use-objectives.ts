import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  objectiveListSchema,
  objectiveSchema,
  standardPathResultSchema,
  standardPathStateSchema,
  thesisDetailSchema,
  type createObjectiveSchema,
} from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';
import { objectiveKeys, toQuery, type ObjectiveFilters } from '../keys';

export type Objective = z.output<typeof objectiveSchema>;
export type ObjectiveBody = z.infer<typeof createObjectiveSchema>;

export function useObjectives(thesisId: string | null, filters: ObjectiveFilters) {
  return useQuery({
    queryKey: objectiveKeys.list(thesisId ?? 'none', filters),
    enabled: Boolean(thesisId),
    queryFn: () =>
      apiGet(`/api/v1/theses/${thesisId}/objectives${toQuery(filters)}`, objectiveListSchema),
  });
}

export function useObjective(thesisId: string | null, objectiveId: string | null) {
  return useQuery({
    queryKey: objectiveKeys.detail(thesisId ?? 'none', objectiveId ?? 'none'),
    enabled: Boolean(thesisId && objectiveId),
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}/objectives/${objectiveId}`, objectiveSchema),
  });
}

export function useThesisMembers(thesisId: string | null) {
  return useQuery({
    queryKey: ['thesis', thesisId],
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}`, thesisDetailSchema),
  });
}

function invalidateObjectiveViews(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: objectiveKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['supervision'] }),
    queryClient.invalidateQueries({ queryKey: ['standard-path'] }),
  ]);
}

export function useStandardPath(thesisId: string | null) {
  return useQuery({
    queryKey: ['standard-path', thesisId],
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(`/api/v1/theses/${thesisId}/standard-path`, standardPathStateSchema),
  });
}

export function useApplyStandardPath(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend(`/api/v1/theses/${thesisId}/standard-path`, standardPathResultSchema, {}),
    onSuccess: () => invalidateObjectiveViews(queryClient),
  });
}

export function useCreateObjective(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ObjectiveBody) =>
      apiSend(`/api/v1/theses/${thesisId}/objectives`, objectiveSchema, body),
    onSuccess: () => invalidateObjectiveViews(queryClient),
  });
}

const deletedSchema = z.object({ id: z.string().uuid() });

export function useDeleteObjective(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objectiveId: string) =>
      apiSend(`/api/v1/theses/${thesisId}/objectives/${objectiveId}`, deletedSchema, {}, 'DELETE'),
    onSuccess: () => invalidateObjectiveViews(queryClient),
  });
}

export function useUpdateListedObjective(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { objectiveId: string; body: ObjectiveBody }) =>
      apiSend(
        `/api/v1/theses/${thesisId}/objectives/${input.objectiveId}`,
        objectiveSchema,
        input.body,
        'PATCH',
      ),
    onSuccess: () => invalidateObjectiveViews(queryClient),
  });
}

export function useUpdateObjective(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ObjectiveBody) =>
      apiSend(
        `/api/v1/theses/${thesisId}/objectives/${objectiveId}`,
        objectiveSchema,
        body,
        'PATCH',
      ),
    onSuccess: () => invalidateObjectiveViews(queryClient),
  });
}
