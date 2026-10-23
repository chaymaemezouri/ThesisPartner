import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Select } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { useAdminUsers, type AdminUserListParams } from './hooks/use-admin';

export function AdminUsersPage() {
  const t = useT();
  const [searchInput, setSearchInput] = useState('');
  const [params, setParams] = useState<AdminUserListParams>({ page: 1, pageSize: 20 });
  const list = useAdminUsers(params);

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('admin.users.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('admin.users.subtitle')}</p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setParams((current) => ({ ...current, search: searchInput, page: 1 }));
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <Input
            id="admin-user-search"
            label={t('common.search')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
          />
        </div>
        <div className="w-40">
          <Select
            id="admin-user-status"
            label={t('admin.users.filterStatus')}
            value={params.status ?? ''}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                status: (event.target.value || undefined) as AdminUserListParams['status'],
                page: 1,
              }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="ACTIVE">{t('admin.users.statusActive')}</option>
            <option value="DISABLED">{t('admin.users.statusDisabled')}</option>
          </Select>
        </div>
        <div className="w-48">
          <Select
            id="admin-user-role"
            label={t('admin.users.filterRole')}
            value={params.membershipRole ?? ''}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                membershipRole: (event.target.value ||
                  undefined) as AdminUserListParams['membershipRole'],
                page: 1,
              }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="DOCTORAL_STUDENT">{t('admin.roles.doctoral')}</option>
            <option value="SUPERVISOR">{t('admin.roles.supervisor')}</option>
            <option value="ADMIN">{t('admin.roles.thesisAdmin')}</option>
          </Select>
        </div>
        <div className="w-44">
          <Select
            id="admin-user-platform"
            label={t('admin.users.filterPlatform')}
            value={params.platformRole ?? ''}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                platformRole: (event.target.value ||
                  undefined) as AdminUserListParams['platformRole'],
                page: 1,
              }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="USER">{t('admin.roles.user')}</option>
            <option value="SUPER_ADMIN">{t('admin.roles.superAdmin')}</option>
          </Select>
        </div>
        <Button type="submit">{t('admin.users.applyFilters')}</Button>
      </form>

      {list.isLoading ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : list.isError ? (
        <p role="alert" className="text-sm text-danger">
          {list.error instanceof ApiClientError ? list.error.body.message : t('errors.generic')}
        </p>
      ) : list.data && list.data.users.length === 0 ? (
        <p className="text-sm text-muted">{t('admin.users.empty')}</p>
      ) : list.data ? (
        <>
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('admin.users.colName')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.users.colEmail')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.users.colRoles')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.users.colStatus')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.users.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.users.map((user) => (
                  <tr key={user.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/utilisateurs/${user.id}`}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {user.displayName}
                      </Link>
                      {user.platformRole === 'SUPER_ADMIN' ? (
                        <span className="ml-2 text-[11px] text-muted">
                          {t('admin.roles.superAdmin')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 break-all text-muted">{user.email}</td>
                    <td className="px-4 py-3 text-muted">
                      {user.membershipRoles.length === 0
                        ? t('common.none')
                        : user.membershipRoles
                            .map((role) =>
                              role === 'DOCTORAL_STUDENT'
                                ? t('admin.roles.doctoral')
                                : role === 'SUPERVISOR'
                                  ? t('admin.roles.supervisor')
                                  : t('admin.roles.thesisAdmin'),
                            )
                            .join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      {user.disabledAt
                        ? t('admin.users.statusDisabled')
                        : t('admin.users.statusActive')}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
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
                disabled={list.data.page <= 1}
                onClick={() =>
                  setParams((current) => ({
                    ...current,
                    page: Math.max(1, (current.page ?? 1) - 1),
                  }))
                }
              >
                {t('admin.users.prev')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={list.data.page >= totalPages}
                onClick={() =>
                  setParams((current) => ({
                    ...current,
                    page: Math.min(totalPages, (current.page ?? 1) + 1),
                  }))
                }
              >
                {t('admin.users.next')}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
