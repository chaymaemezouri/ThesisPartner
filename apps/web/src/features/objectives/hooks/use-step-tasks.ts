import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { stepTaskListSchema, stepTaskSchema } from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';
import { objectiveKeys } from '../keys';

export type StepTask = z.infer<typeof stepTaskSchema>;

const removedSchema = z.object({ id: z.string().uuid() }).strict();

function path(thesisId: string, objectiveId: string, taskId: string, stepTaskId?: string): string {
  const base = `/api/v1/theses/${thesisId}/objectives/${objectiveId}/tasks/${taskId}/work`;
  return stepTaskId ? `${base}/${stepTaskId}` : base;
}

export function useStepTasks(thesisId: string, objectiveId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['step-tasks', thesisId, objectiveId, taskId],
    enabled: Boolean(taskId),
    queryFn: () => apiGet(path(thesisId, objectiveId, taskId!), stepTaskListSchema),
  });
}

export function useStepTaskMutations(thesisId: string, objectiveId: string, taskId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['step-tasks', thesisId, objectiveId, taskId] }),
      queryClient.invalidateQueries({ queryKey: objectiveKeys.tasks(thesisId, objectiveId) }),
    ]);
  const base = path(thesisId, objectiveId, taskId);
  return {
    create: useMutation({
      mutationFn: (body: { title: string; description?: string }) =>
        apiSend(base, stepTaskSchema, body),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (input: { id: string; title: string; description?: string }) =>
        apiSend(`${base}/${input.id}`, stepTaskSchema, {
          title: input.title,
          description: input.description,
        }, 'PATCH'),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiSend(`${base}/${id}`, removedSchema, {}, 'DELETE'),
      onSuccess: refresh,
    }),
    submit: useMutation({
      mutationFn: (id: string) => apiSend(`${base}/${id}/submit`, stepTaskSchema, {}),
      onSuccess: refresh,
    }),
    review: useMutation({
      mutationFn: (input: { id: string; decision: string; message?: string }) =>
        apiSend(`${base}/${input.id}/review`, stepTaskSchema, {
          decision: input.decision,
          message: input.message,
        }),
      onSuccess: refresh,
    }),
    remark: useMutation({
      mutationFn: (input: { id: string; message: string }) =>
        apiSend(`${base}/${input.id}/remarks`, stepTaskSchema, { message: input.message }),
      onSuccess: refresh,
    }),
    removeFile: useMutation({
      mutationFn: (input: { id: string; versionId: string }) =>
        apiSend(`${base}/${input.id}/files/${input.versionId}`, removedSchema, {}, 'DELETE'),
      onSuccess: refresh,
    }),
    removeStepFile: useMutation({
      mutationFn: (versionId: string) =>
        apiSend(
          `/api/v1/theses/${thesisId}/objectives/${objectiveId}/tasks/${taskId}/files/${versionId}`,
          removedSchema,
          {},
          'DELETE',
        ),
      onSuccess: refresh,
    }),
  };
}
