import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  objectiveSchema,
  taskListSchema,
  taskSchema,
  type createTaskSchema,
  type updateTaskSchema,
} from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';
import { objectiveKeys } from '../keys';
import { supervisionKeys } from '../../supervision/keys';

export type Task = z.infer<typeof taskSchema>;
export type TaskDraft = z.infer<typeof createTaskSchema>;
export type TaskPatch = z.infer<typeof updateTaskSchema>;

function taskPath(thesisId: string, objectiveId: string, taskId?: string): string {
  const base = `/api/v1/theses/${thesisId}/objectives/${objectiveId}/tasks`;
  return taskId ? `${base}/${taskId}` : base;
}

function refreshObjective(
  queryClient: ReturnType<typeof useQueryClient>,
  thesisId: string,
  objectiveId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: objectiveKeys.detail(thesisId, objectiveId) }),
    queryClient.invalidateQueries({ queryKey: ['objectives', 'list', thesisId] }),
    queryClient.invalidateQueries({ queryKey: objectiveKeys.tasks(thesisId, objectiveId) }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: supervisionKeys.theses }),
  ]);
}

export function useObjectiveTasks(thesisId: string | null, objectiveId: string | null) {
  return useQuery({
    queryKey: objectiveKeys.tasks(thesisId ?? 'none', objectiveId ?? 'none'),
    enabled: Boolean(thesisId && objectiveId),
    queryFn: () => apiGet(taskPath(thesisId!, objectiveId!), taskListSchema),
  });
}

export function useCreateTask(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskDraft) => apiSend(taskPath(thesisId, objectiveId), taskSchema, body),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

const deletedSchema = z.object({ id: z.string().uuid() });

export function useDeleteTask(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      apiSend(taskPath(thesisId, objectiveId, taskId), deletedSchema, {}, 'DELETE'),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

export function useUpdateTask(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; body: TaskPatch }) =>
      apiSend(taskPath(thesisId, objectiveId, input.taskId), taskSchema, input.body, 'PATCH'),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

export function useReorderTasks(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tasks: { taskId: string; position: number }[]) =>
      apiSend(`${taskPath(thesisId, objectiveId)}/reorder`, taskListSchema, { tasks }, 'PATCH'),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

export function useRequestObjectiveCompletion(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend(
        `/api/v1/theses/${thesisId}/objectives/${objectiveId}/request-completion`,
        objectiveSchema,
        {},
      ),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

export function useApproveObjectiveCompletion(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend(
        `/api/v1/theses/${thesisId}/objectives/${objectiveId}/approve-completion`,
        objectiveSchema,
        {},
      ),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}

export function useRequestObjectiveChanges(thesisId: string, objectiveId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiSend(
        `/api/v1/theses/${thesisId}/objectives/${objectiveId}/request-changes`,
        objectiveSchema,
        message.trim() ? { message: message.trim() } : {},
      ),
    onSuccess: () => refreshObjective(queryClient, thesisId, objectiveId),
  });
}
