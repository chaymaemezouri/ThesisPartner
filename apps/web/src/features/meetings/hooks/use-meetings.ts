import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  meetingListSchema,
  meetingSchema,
  type cancelMeetingSchema,
  type createMeetingSchema,
  type holdMeetingSchema,
  type requestMeetingSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { apiGet, apiSend } from '../../../api/client';

export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingDraft = z.infer<typeof createMeetingSchema>;
export type MeetingRequestDraft = z.infer<typeof requestMeetingSchema>;
export type MeetingHoldDraft = z.infer<typeof holdMeetingSchema>;
export type MeetingCancelDraft = z.infer<typeof cancelMeetingSchema>;

function base(thesisId: string, meetingId?: string): string {
  const path = `/api/v1/theses/${thesisId}/meetings`;
  return meetingId ? `${path}/${meetingId}` : path;
}

function refresh(queryClient: ReturnType<typeof useQueryClient>, thesisId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['meetings', thesisId] }),
    queryClient.invalidateQueries({ queryKey: ['supervision'] }),
  ]);
}

export function useMeetings(thesisId: string | null) {
  return useQuery({
    queryKey: ['meetings', thesisId],
    enabled: Boolean(thesisId),
    queryFn: () => apiGet(base(thesisId!), meetingListSchema),
  });
}

export function useMeeting(thesisId: string | null, meetingId: string | null) {
  return useQuery({
    queryKey: ['meetings', thesisId, meetingId],
    enabled: Boolean(thesisId && meetingId),
    queryFn: () => apiGet(base(thesisId!, meetingId!), meetingSchema),
  });
}

export function useCreateMeeting(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingDraft) => apiSend(base(thesisId), meetingSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useRequestMeeting(thesisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingRequestDraft) =>
      apiSend(`${base(thesisId)}/requests`, meetingSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useReviseRequest(thesisId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingRequestDraft) =>
      apiSend(`${base(thesisId, meetingId)}/request`, meetingSchema, body, 'POST'),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useConfirmMeeting(thesisId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingDraft) =>
      apiSend(`${base(thesisId, meetingId)}/confirm`, meetingSchema, body, 'POST'),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useUpdateMeeting(thesisId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingDraft) =>
      apiSend(base(thesisId, meetingId), meetingSchema, body, 'POST'),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useHoldMeeting(thesisId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingHoldDraft) =>
      apiSend(`${base(thesisId, meetingId)}/hold`, meetingSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}

export function useCancelMeeting(thesisId: string, meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeetingCancelDraft) =>
      apiSend(`${base(thesisId, meetingId)}/cancel`, meetingSchema, body),
    onSuccess: () => refresh(queryClient, thesisId),
  });
}
