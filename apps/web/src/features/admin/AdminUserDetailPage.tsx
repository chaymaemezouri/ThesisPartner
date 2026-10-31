import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Input, Modal, Select, Textarea } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { AdminBadge, AdminPanel } from './AdminUi';
import {
  useAdminUser,
  useReactivateUser,
  useSuspendUser,
  useUpdateAdminUser,
} from './hooks/use-admin';

export function AdminUserDetailPage() {
  const t = useT();
  const { userId } = useParams<{ userId: string }>();
  const me = useMeQuery();
  const detail = useAdminUser(userId);
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const update = useUpdateAdminUser();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    givenName: '',
    familyName: '',
    institution: '',
    platformRole: 'USER' as 'USER' | 'SUPER_ADMIN',
    markEmailVerified: false,
  });

  const user = detail.data;
  const isSelf = Boolean(user && me.data?.user.id === user.id);
  const isDisabled = Boolean(user?.disabledAt);
  const pending = suspend.isPending || reactivate.isPending;

  const openEdit = () => {
    if (!user) return;
    setEditError(null);
    setEditForm({
      givenName: user.givenName,
      familyName: user.familyName,
      institution: user.institution ?? '',
      platformRole: user.platformRole,
      markEmailVerified: user.emailVerified,
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!user) return;
    setEditError(null);
    try {
      await update.mutateAsync({
        userId: user.id,
        body: {
          givenName: editForm.givenName.trim(),
          familyName: editForm.familyName.trim(),
          institution: editForm.institution,
          platformRole: editForm.platformRole,
          markEmailVerified: editForm.markEmailVerified,
        },
      });
      setEditOpen(false);
    } catch (error) {
      setEditError(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  const submitAction = async () => {
    if (!user) return;
    setActionError(null);
    const trimmed = reason.trim();
    if (!isDisabled && trimmed.length < 1) {
      setActionError(t('admin.users.reasonRequired'));
      return;
    }
    try {
      if (isDisabled) {
        await reactivate.mutateAsync({ userId: user.id, reason: trimmed || undefined });
      } else {
        await suspend.mutateAsync({ userId: user.id, reason: trimmed });
      }
      setConfirmOpen(false);
      setReason('');
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.body.message : t('errors.generic'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/utilisateurs" className="text-sm text-muted hover:text-ink">
          {t('common.back')}
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {user?.displayName ?? t('admin.users.detailTitle')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('admin.users.detailSubtitle')}</p>
      </div>

      {detail.isLoading ? (
        <p role="status" className="text-sm text-muted">
          {t('common.loading')}
        </p>
      ) : detail.isError ? (
        <p role="alert" className="text-sm text-danger">
          {detail.error instanceof ApiClientError ? detail.error.body.message : t('errors.generic')}
        </p>
      ) : user ? (
        <>
          <AdminPanel>
            <h2 id="admin-profile" className="text-sm font-semibold text-ink">
              {t('admin.users.profile')}
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('auth.email')} value={user.email} />
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  {t('admin.users.colStatus')}
                </dt>
                <dd className="mt-1">
                  <AdminBadge tone={user.disabledAt ? 'danger' : 'ok'}>
                    {user.disabledAt
                      ? t('admin.users.statusDisabled')
                      : t('admin.users.statusActive')}
                  </AdminBadge>
                </dd>
              </div>
              <Field label={t('settings.displayName')} value={user.displayName} />
              <Field
                label={t('admin.users.filterPlatform')}
                value={
                  user.platformRole === 'SUPER_ADMIN'
                    ? t('admin.roles.superAdmin')
                    : t('admin.roles.user')
                }
              />
              <Field
                label={t('admin.users.emailVerified')}
                value={user.emailVerified ? t('common.confirm') : t('common.none')}
              />
              <Field
                label={t('admin.users.colCreated')}
                value={new Date(user.createdAt).toLocaleString()}
              />
              <Field
                label={t('profile.institution')}
                value={user.institution ?? t('common.notProvided')}
              />
              <Field
                label={t('profile.academicTitle')}
                value={user.academicTitle ?? t('common.notProvided')}
              />
              {user.disabledAt ? (
                <Field
                  label={t('admin.users.disabledAt')}
                  value={new Date(user.disabledAt).toLocaleString()}
                />
              ) : null}
            </dl>
          </AdminPanel>

          <section
            className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-card"
            aria-labelledby="admin-memberships"
          >
            <h2 id="admin-memberships" className="text-sm font-medium text-ink">
              {t('admin.users.memberships')}
            </h2>
            <p className="mt-1 text-sm text-muted">{t('admin.users.membershipsHelp')}</p>
            {user.memberships.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t('admin.users.noMemberships')}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {user.memberships.map((item) => (
                  <li key={`${item.thesisId}-${item.role}`} className="py-3 text-sm">
                    <p className="font-medium text-ink">{item.thesisTitle}</p>
                    <p className="mt-1 text-muted">
                      {item.role === 'DOCTORAL_STUDENT'
                        ? t('admin.roles.doctoral')
                        : item.role === 'SUPERVISOR'
                          ? t('admin.roles.supervisor')
                          : t('admin.roles.thesisAdmin')}
                      {' · '}
                      {item.thesisStatus}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-line bg-surface px-4 py-4">
            <h2 className="text-sm font-medium text-ink">{t('admin.users.actions')}</h2>
            <p className="mt-1 text-sm text-muted">{t('admin.users.actionsHelp')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={openEdit}>
                {t('admin.users.edit')}
              </Button>
              {isSelf ? (
                <p className="self-center text-sm text-muted">
                  {t('admin.users.cannotSelfSuspend')}
                </p>
              ) : (
                <Button
                  type="button"
                  variant={isDisabled ? 'primary' : 'secondary'}
                  onClick={() => {
                    setActionError(null);
                    setReason('');
                    setConfirmOpen(true);
                  }}
                >
                  {isDisabled ? t('admin.users.reactivate') : t('admin.users.suspend')}
                </Button>
              )}
            </div>
          </section>
        </>
      ) : null}

      <Modal
        open={editOpen}
        title={t('admin.users.editTitle')}
        closeLabel={t('common.close')}
        onClose={() => {
          if (!update.isPending) setEditOpen(false);
        }}
      >
        <div className="space-y-3">
          <Input
            id="admin-edit-given"
            label={t('auth.givenName')}
            value={editForm.givenName}
            onChange={(event) => setEditForm((c) => ({ ...c, givenName: event.target.value }))}
          />
          <Input
            id="admin-edit-family"
            label={t('auth.familyName')}
            value={editForm.familyName}
            onChange={(event) => setEditForm((c) => ({ ...c, familyName: event.target.value }))}
          />
          <Input
            id="admin-edit-institution"
            label={t('auth.institution')}
            value={editForm.institution}
            onChange={(event) => setEditForm((c) => ({ ...c, institution: event.target.value }))}
          />
          <Select
            id="admin-edit-platform"
            label={t('admin.users.filterPlatform')}
            value={editForm.platformRole}
            onChange={(event) =>
              setEditForm((c) => ({
                ...c,
                platformRole: event.target.value as 'USER' | 'SUPER_ADMIN',
              }))
            }
          >
            <option value="USER">{t('admin.roles.user')}</option>
            <option value="SUPER_ADMIN">{t('admin.roles.superAdmin')}</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={editForm.markEmailVerified}
              onChange={(event) =>
                setEditForm((c) => ({ ...c, markEmailVerified: event.target.checked }))
              }
            />
            {t('admin.users.markEmailVerified')}
          </label>
          {editError ? (
            <p role="alert" className="text-sm text-danger">
              {editError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => setEditOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" disabled={update.isPending} onClick={() => void submitEdit()}>
              {t('admin.users.editSubmit')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        title={isDisabled ? t('admin.users.reactivateTitle') : t('admin.users.suspendTitle')}
        closeLabel={t('common.close')}
        onClose={() => {
          if (!pending) setConfirmOpen(false);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {isDisabled ? t('admin.users.reactivateConfirm') : t('admin.users.suspendConfirm')}
          </p>
          <Textarea
            id="admin-suspend-reason"
            label={isDisabled ? t('admin.users.reasonOptional') : t('admin.users.reasonRequired')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
          />
          {actionError ? (
            <p role="alert" className="text-sm text-danger">
              {actionError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant={isDisabled ? 'primary' : 'secondary'}
              disabled={pending}
              onClick={() => void submitAction()}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}
