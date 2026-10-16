import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  portfolioProjectInputSchema,
  portfolioSchema,
  portfolioSkillInputSchema,
  publicationInputSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend } from '../../../api/client';

export type Portfolio = z.output<typeof portfolioSchema>;
export type PublicationDraft = z.infer<typeof publicationInputSchema>;
export type ProjectDraft = z.infer<typeof portfolioProjectInputSchema>;
export type SkillDraft = z.infer<typeof portfolioSkillInputSchema>;

const key = ['portfolio'] as const;

export function usePortfolio() {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet('/api/v1/portfolio', portfolioSchema),
  });
}

function refresh(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: key });
}

export function useAddPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PublicationDraft) =>
      apiSend('/api/v1/portfolio/publications', portfolioSchema, body),
    onSuccess: () => refresh(queryClient),
  });
}

export function useRemovePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/v1/portfolio/publications/${id}/remove`, portfolioSchema, {}),
    onSuccess: () => refresh(queryClient),
  });
}

export function useAddProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectDraft) =>
      apiSend('/api/v1/portfolio/projects', portfolioSchema, body),
    onSuccess: () => refresh(queryClient),
  });
}

export function useRemoveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/v1/portfolio/projects/${id}/remove`, portfolioSchema, {}),
    onSuccess: () => refresh(queryClient),
  });
}

export function useAddSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SkillDraft) => apiSend('/api/v1/portfolio/skills', portfolioSchema, body),
    onSuccess: () => refresh(queryClient),
  });
}

export function useRemoveSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/v1/portfolio/skills/${id}/remove`, portfolioSchema, {}),
    onSuccess: () => refresh(queryClient),
  });
}
