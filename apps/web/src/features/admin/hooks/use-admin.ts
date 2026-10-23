import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminAnalyticsSchema,
  adminAuditListSchema,
  adminReactivateBodySchema,
  adminStatsSchema,
  adminSuspendBodySchema,
  adminSystemSchema,
  adminUserDetailSchema,
  adminUserListSchema,
} from '@thesispartner/validation';
import { apiGet, apiSend } from '../../../api/client';

export type AdminUserListParams = {
  search?: string;
  status?: 'ACTIVE' | 'DISABLED';
  membershipRole?: 'DOCTORAL_STUDENT' | 'SUPERVISOR' | 'ADMIN';
  platformRole?: 'USER' | 'SUPER_ADMIN';
  page?: number;
  pageSize?: number;
};

export type AdminAuditListParams = {
  search?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function usersQueryString(params: AdminUserListParams): string {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);
  if (params.membershipRole) query.set('membershipRole', params.membershipRole);
  if (params.platformRole) query.set('platformRole', params.platformRole);
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  return query.toString();
}

function auditQueryString(params: AdminAuditListParams): string {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.action?.trim()) query.set('action', params.action.trim());
  if (params.entityType?.trim()) query.set('entityType', params.entityType.trim());
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  query.set('page', String(params.page ?? 1));
  query.set('pageSize', String(params.pageSize ?? 20));
  return query.toString();
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiGet('/api/v1/admin/stats', adminStatsSchema),
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiGet('/api/v1/admin/analytics', adminAnalyticsSchema),
  });
}

export function useAdminAudit(params: AdminAuditListParams) {
  const qs = auditQueryString(params);
  return useQuery({
    queryKey: ['admin', 'audit', qs],
    queryFn: () => apiGet(`/api/v1/admin/audit?${qs}`, adminAuditListSchema),
  });
}

export function useAdminSystem() {
  return useQuery({
    queryKey: ['admin', 'system'],
    queryFn: () => apiGet('/api/v1/admin/system', adminSystemSchema),
    refetchInterval: 30_000,
  });
}

export function useAdminUsers(params: AdminUserListParams) {
  const qs = usersQueryString(params);
  return useQuery({
    queryKey: ['admin', 'users', qs],
    queryFn: () => apiGet(`/api/v1/admin/users?${qs}`, adminUserListSchema),
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => apiGet(`/api/v1/admin/users/${userId}`, adminUserDetailSchema),
    enabled: Boolean(userId),
  });
}

export function useSuspendUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; reason: string }) =>
      apiSend(
        `/api/v1/admin/users/${input.userId}/suspend`,
        adminUserDetailSchema,
        adminSuspendBodySchema.parse({ reason: input.reason }),
      ),
    onSuccess: async (data) => {
      await client.invalidateQueries({ queryKey: ['admin'] });
      client.setQueryData(['admin', 'users', data.id], data);
    },
  });
}

export function useReactivateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; reason?: string }) =>
      apiSend(
        `/api/v1/admin/users/${input.userId}/reactivate`,
        adminUserDetailSchema,
        adminReactivateBodySchema.parse({ reason: input.reason }),
      ),
    onSuccess: async (data) => {
      await client.invalidateQueries({ queryKey: ['admin'] });
      client.setQueryData(['admin', 'users', data.id], data);
    },
  });
}
