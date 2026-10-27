import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Select } from '@thesispartner/ui';
import { useQuery } from '@tanstack/react-query';
import { adminInvitationListSchema, invitationStatusSchema } from '@thesispartner/validation';
import { apiGet } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import {
  AdminBadge,
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminState,
  type AdminTone,
} from './AdminUi';

function invitationTone(status: string): AdminTone {
  if (status === 'ACCEPTED') return 'ok';
  if (status === 'PENDING') return 'warn';
  if (status === 'REJECTED') return 'danger';
  if (status === 'EXPIRED') return 'muted';
  return 'violet';
}

const statuses = invitationStatusSchema.options;

export function AdminInvitationsPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (search.trim()) qs.set('search', search.trim());
  if (status) qs.set('status', status);

  const list = useQuery({
    queryKey: ['admin', 'invitations', qs.toString()],
    queryFn: () => apiGet(`/api/v1/admin/invitations?${qs.toString()}`, adminInvitationListSchema),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.invitations.title')}
        subtitle={t('admin.invitations.subtitle')}
      />

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void list.refetch();
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <Input
            id="admin-inv-search"
            label={t('common.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            id="admin-inv-status"
            label={t('admin.invitations.filterStatus')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('common.all')}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">{t('admin.users.applyFilters')}</Button>
      </form>

      <AdminState loading={list.isLoading} error={list.error}>
        {list.data && list.data.invitations.length === 0 ? (
          <AdminEmpty>{t('admin.invitations.empty')}</AdminEmpty>
        ) : list.data ? (
          <>
            <AdminPanel>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('invitations.thesis')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colEmail')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('invitations.from')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.invitations.relations')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.invitations.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-line last:border-0 transition-colors hover:bg-brand-soft/40"
                      >
                        <td className="px-4 py-3 font-medium text-ink">{item.thesisTitle}</td>
                        <td className="px-4 py-3 break-all text-muted">{item.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <AdminBadge tone={invitationTone(item.status)}>
                              {item.status}
                            </AdminBadge>
                            <AdminBadge
                              tone={
                                item.emailStatus === 'SENT'
                                  ? 'ok'
                                  : item.emailStatus === 'FAILED'
                                    ? 'danger'
                                    : 'muted'
                              }
                            >
                              {item.emailStatus}
                            </AdminBadge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{item.invitedByName}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/theses/${item.thesisId}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {t('admin.invitations.viewRelations')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
            <div className="flex justify-between text-sm">
              <p className="text-muted">
                {t('admin.users.pagination', {
                  page: String(list.data.page),
                  totalPages: String(totalPages),
                  total: String(list.data.total),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  {t('admin.users.prev')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('admin.users.next')}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </AdminState>
    </div>
  );
}
