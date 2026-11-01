import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Select } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { AdminBadge, AdminEmpty, AdminPageHeader, AdminPanel, AdminState } from './AdminUi';
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useReactivateUser,
  useSuspendUser,
  type AdminUserListParams,
} from './hooks/use-admin';

const emptyCreate = {
  email: '',
  password: '',
  givenName: '',
  familyName: '',
  institution: '',
  platformRole: 'USER' as 'USER' | 'SUPER_ADMIN',
  thesisRole: 'NONE' as 'NONE' | 'DOCTORAL_STUDENT' | 'SUPERVISOR',
  thesisTitle: '',
  markEmailVerified: true,
};

export function AdminUsersPage() {
  const t = useT();
  const navigate = useNavigate();
  const me = useMeQuery();
  const [searchInput, setSearchInput] = useState('');
  const [params, setParams] = useState<AdminUserListParams>({ page: 1, pageSize: 20 });
  const list = useAdminUsers(params);
  const create = useCreateAdminUser();
  const suspend = useSuspendUser();
  const deleteUser = useDeleteAdminUser();
  const reactivate = useReactivateUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusUser, setStatusUser] = useState<{
    id: string;
    action: 'suspend' | 'delete' | 'reactivate';
    name: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusPending = suspend.isPending || deleteUser.isPending || reactivate.isPending;

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  const submitCreate = async () => {
    setCreateError(null);
    try {
      const created = await create.mutateAsync({
        email: createForm.email.trim(),
        password: createForm.password,
        givenName: createForm.givenName.trim(),
        familyName: createForm.familyName.trim(),
        institution: createForm.institution.trim() || undefined,
        platformRole: createForm.platformRole,
        thesisRole: createForm.thesisRole,
        thesisTitle:
          createForm.thesisRole === 'DOCTORAL_STUDENT'
            ? createForm.thesisTitle.trim() || undefined
            : undefined,
        markEmailVerified: createForm.markEmailVerified,
      });
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      await navigate(`/admin/utilisateurs/${created.id}`);
    } catch (error) {
      setCreateError(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  const submitStatus = async () => {
    if (!statusUser) return;
    setStatusError(null);
    const reason = statusReason.trim();
    if (statusUser.action !== 'reactivate' && reason.length < 1) {
      setStatusError(t('admin.users.reasonRequired'));
      return;
    }
    try {
      if (statusUser.action === 'reactivate') {
        await reactivate.mutateAsync({ userId: statusUser.id, reason: reason || undefined });
      } else if (statusUser.action === 'delete') {
        await deleteUser.mutateAsync({ userId: statusUser.id, reason });
      } else {
        await suspend.mutateAsync({ userId: statusUser.id, reason });
      }
      setStatusUser(null);
      setStatusReason('');
    } catch (error) {
      setStatusError(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AdminPageHeader title={t('admin.users.title')} subtitle={t('admin.users.subtitle')} />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          {t('admin.users.create')}
        </Button>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
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
            <option value="DELETED">{t('admin.users.statusDeleted')}</option>
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

      <AdminState loading={list.isLoading} error={list.error}>
        {list.data && list.data.users.length === 0 ? (
          <AdminEmpty>{t('admin.users.empty')}</AdminEmpty>
        ) : list.data ? (
          <>
            <AdminPanel>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colName')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colEmail')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colRoles')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colCreated')}</th>
                      <th className="px-4 py-3 font-medium">{t('admin.users.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.users.map((user) => {
                      const isSelf = me.data?.user.id === user.id;
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-line last:border-0 transition-colors hover:bg-brand-soft/40"
                        >
                          <td className="px-4 py-3">
                            <Link
                              to={`/admin/utilisateurs/${user.id}`}
                              className="font-medium text-brand hover:underline"
                            >
                              {user.displayName}
                            </Link>
                            {user.platformRole === 'SUPER_ADMIN' ? (
                              <span className="ml-2">
                                <AdminBadge tone="violet">{t('admin.roles.superAdmin')}</AdminBadge>
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 break-all text-muted">{user.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.membershipRoles.length === 0
                                ? t('common.none')
                                : user.membershipRoles.map((role) => (
                                    <AdminBadge
                                      key={role}
                                      tone={
                                        role === 'DOCTORAL_STUDENT'
                                          ? 'teal'
                                          : role === 'SUPERVISOR'
                                            ? 'brand'
                                            : 'muted'
                                      }
                                    >
                                      {role === 'DOCTORAL_STUDENT'
                                        ? t('admin.roles.doctoral')
                                        : role === 'SUPERVISOR'
                                          ? t('admin.roles.supervisor')
                                          : t('admin.roles.thesisAdmin')}
                                    </AdminBadge>
                                  ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <AdminBadge
                              tone={user.deletedAt ? 'danger' : user.disabledAt ? 'warn' : 'ok'}
                            >
                              {user.deletedAt
                                ? t('admin.users.statusDeleted')
                                : user.disabledAt
                                  ? t('admin.users.statusDisabled')
                                  : t('admin.users.statusActive')}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={`/admin/utilisateurs/${user.id}`}
                                className="text-sm font-medium text-brand hover:underline"
                              >
                                {t('admin.users.open')}
                              </Link>
                              {!isSelf && !user.deletedAt ? (
                                <>
                                  {user.disabledAt ? (
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-ink hover:underline"
                                      onClick={() => {
                                        setStatusError(null);
                                        setStatusReason('');
                                        setStatusUser({
                                          id: user.id,
                                          action: 'reactivate',
                                          name: user.displayName,
                                        });
                                      }}
                                    >
                                      {t('admin.users.reactivate')}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="text-sm font-medium text-warn hover:underline"
                                      onClick={() => {
                                        setStatusError(null);
                                        setStatusReason('');
                                        setStatusUser({
                                          id: user.id,
                                          action: 'suspend',
                                          name: user.displayName,
                                        });
                                      }}
                                    >
                                      {t('admin.users.suspend')}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="text-sm font-medium text-danger hover:underline"
                                    onClick={() => {
                                      setStatusError(null);
                                      setStatusReason('');
                                      setStatusUser({
                                        id: user.id,
                                        action: 'delete',
                                        name: user.displayName,
                                      });
                                    }}
                                  >
                                    {t('admin.users.delete')}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AdminPanel>

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
      </AdminState>

      <Modal
        open={createOpen}
        title={t('admin.users.createTitle')}
        closeLabel={t('common.close')}
        onClose={() => {
          if (!create.isPending) setCreateOpen(false);
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('admin.users.createHelp')}</p>
          <Input
            id="admin-create-given"
            label={t('auth.givenName')}
            value={createForm.givenName}
            onChange={(event) => setCreateForm((c) => ({ ...c, givenName: event.target.value }))}
          />
          <Input
            id="admin-create-family"
            label={t('auth.familyName')}
            value={createForm.familyName}
            onChange={(event) => setCreateForm((c) => ({ ...c, familyName: event.target.value }))}
          />
          <Input
            id="admin-create-email"
            label={t('auth.email')}
            type="email"
            value={createForm.email}
            onChange={(event) => setCreateForm((c) => ({ ...c, email: event.target.value }))}
          />
          <Input
            id="admin-create-password"
            label={t('auth.password')}
            type="password"
            hint={t('auth.passwordHint')}
            value={createForm.password}
            onChange={(event) => setCreateForm((c) => ({ ...c, password: event.target.value }))}
          />
          <Input
            id="admin-create-institution"
            label={t('auth.institution')}
            hint={t('auth.optional')}
            value={createForm.institution}
            onChange={(event) => setCreateForm((c) => ({ ...c, institution: event.target.value }))}
          />
          <Select
            id="admin-create-platform"
            label={t('admin.users.filterPlatform')}
            value={createForm.platformRole}
            onChange={(event) =>
              setCreateForm((c) => ({
                ...c,
                platformRole: event.target.value as 'USER' | 'SUPER_ADMIN',
              }))
            }
          >
            <option value="USER">{t('admin.roles.user')}</option>
            <option value="SUPER_ADMIN">{t('admin.roles.superAdmin')}</option>
          </Select>
          <Select
            id="admin-create-thesis-role"
            label={t('admin.users.createThesisRole')}
            hint={t('admin.users.createThesisRoleHelp')}
            value={createForm.thesisRole}
            onChange={(event) =>
              setCreateForm((c) => ({
                ...c,
                thesisRole: event.target.value as 'NONE' | 'DOCTORAL_STUDENT' | 'SUPERVISOR',
              }))
            }
          >
            <option value="NONE">{t('admin.users.thesisRoleNone')}</option>
            <option value="DOCTORAL_STUDENT">{t('admin.roles.doctoral')}</option>
            <option value="SUPERVISOR">{t('admin.roles.supervisor')}</option>
          </Select>
          {createForm.thesisRole === 'DOCTORAL_STUDENT' ? (
            <Input
              id="admin-create-thesis-title"
              label={t('admin.users.createThesisTitle')}
              hint={t('admin.users.createThesisTitleHelp')}
              value={createForm.thesisTitle}
              onChange={(event) =>
                setCreateForm((c) => ({ ...c, thesisTitle: event.target.value }))
              }
            />
          ) : null}
          {createForm.thesisRole === 'SUPERVISOR' ? (
            <p className="text-sm text-muted">{t('admin.users.createSupervisorHelp')}</p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={createForm.markEmailVerified}
              onChange={(event) =>
                setCreateForm((c) => ({ ...c, markEmailVerified: event.target.checked }))
              }
            />
            {t('admin.users.markEmailVerified')}
          </label>
          {createError ? (
            <p role="alert" className="text-sm text-danger">
              {createError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={create.isPending}
              onClick={() => setCreateOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={create.isPending} onClick={() => void submitCreate()}>
              {t('admin.users.createSubmit')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(statusUser)}
        title={
          statusUser?.action === 'reactivate'
            ? t('admin.users.reactivateTitle')
            : statusUser?.action === 'delete'
              ? t('admin.users.deleteTitle')
              : t('admin.users.suspendTitle')
        }
        closeLabel={t('common.close')}
        onClose={() => {
          if (!statusPending) setStatusUser(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {statusUser?.action === 'reactivate'
              ? t('admin.users.reactivateConfirm')
              : statusUser?.action === 'delete'
                ? t('admin.users.deleteConfirm')
                : t('admin.users.suspendConfirm')}
            {statusUser ? ` (${statusUser.name})` : null}
          </p>
          <Input
            id="admin-list-status-reason"
            label={
              statusUser?.action === 'reactivate'
                ? t('admin.users.reasonOptional')
                : t('admin.users.reasonRequired')
            }
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
          />
          {statusError ? (
            <p role="alert" className="text-sm text-danger">
              {statusError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={statusPending}
              onClick={() => setStatusUser(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={statusPending} onClick={() => void submitStatus()}>
              {statusUser?.action === 'reactivate'
                ? t('admin.users.reactivate')
                : statusUser?.action === 'delete'
                  ? t('admin.users.delete')
                  : t('admin.users.suspend')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
