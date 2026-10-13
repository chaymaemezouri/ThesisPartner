import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceLibrarySchema, sharedResourceInputSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend } from '../../../api/client';

export type ResourceLibrary = z.infer<typeof resourceLibrarySchema>;
export type SharedResource = ResourceLibrary['resources'][number];
export type ResourceDraft = z.infer<typeof sharedResourceInputSchema>;

const key = ['resources'] as const;

export function useResources() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet('/api/v1/resources', resourceLibrarySchema),
  });
}

function refresh(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: key });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ResourceDraft) => apiSend('/api/v1/resources', resourceLibrarySchema, body),
    onSuccess: () => refresh(queryClient),
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: ResourceDraft }) =>
      apiSend(`/api/v1/resources/${input.id}`, resourceLibrarySchema, input.body),
    onSuccess: () => refresh(queryClient),
  });
}

export function useRemoveResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/v1/resources/${id}/remove`, resourceLibrarySchema, {}),
    onSuccess: () => refresh(queryClient),
  });
}
