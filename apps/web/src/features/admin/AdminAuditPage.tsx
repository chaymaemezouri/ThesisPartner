import { useState } from 'react';
import { Button, Input, Select } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';
import { useAdminAudit, type AdminAuditListParams } from './hooks/use-admin';

export function AdminAuditPage() {
  const t = useT();
  const [searchInput, setSearchInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [params, setParams] = useState<AdminAuditListParams>({ page: 1, pageSize: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useAdminAudit(params);
  const selected = list.data?.entries.find((entry) => entry.id === selectedId) ?? null;
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('admin.audit.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('admin.audit.subtitle')}</p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setParams((current) => ({
            ...current,
            search: searchInput,
            action: actionInput || undefined,
            page: 1,
          }));
        }}
      >
        <div className="min-w-[12rem] flex-1">
          <Input
            id="admin-audit-search"
            label={t('common.search')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('admin.audit.searchPlaceholder')}
          />
        </div>
        <div className="w-52">
          <Input
            id="admin-audit-action"
            label={t('admin.audit.filterAction')}
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value)}
            placeholder="admin.user_suspend"
          />
        </div>
        <div className="w-40">
          <Select
            id="admin-audit-entity"
            label={t('admin.audit.filterEntity')}
            value={params.entityType ?? ''}
            onChange={(event) =>
              setParams((current) => ({
                ...current,
                entityType: event.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value="">{t('common.all')}</option>
            <option value="user">user</option>
            <option value="invitation">invitation</option>
            <option value="auth">auth</option>
            <option value="session">session</option>
            <option value="thesis">thesis</option>
          </Select>
        </div>
        <Button type="submit">{t('admin.users.applyFilters')}</Button>
      </form>

      {list.isLoading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : list.isError ? (
        <p className="text-sm text-danger" role="alert">
          {list.error instanceof ApiClientError ? list.error.body.message : t('errors.generic')}
        </p>
      ) : list.data && list.data.entries.length === 0 ? (
        <p className="text-sm text-muted">{t('admin.audit.empty')}</p>
      ) : list.data ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-[11px] tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('admin.audit.colWhen')}</th>
                  <th className="px-3 py-2 font-medium">{t('admin.audit.colAction')}</th>
                  <th className="px-3 py-2 font-medium">{t('admin.audit.colActor')}</th>
                  <th className="px-3 py-2 font-medium">{t('admin.audit.colEntity')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-line last:border-0 ${selectedId === entry.id ? 'bg-canvas' : ''}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-muted">
                      <button
                        type="button"
                        className="text-left hover:text-ink"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        {new Date(entry.createdAt).toLocaleString()}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium text-ink">{entry.action}</td>
                    <td className="px-3 py-2 text-muted">
                      {entry.actorDisplayName ?? entry.actorEmail ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted">{entry.entityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="rounded-md border border-line bg-surface px-4 py-4 text-sm">
            <h2 className="text-sm font-semibold text-ink">{t('admin.audit.detailTitle')}</h2>
            {!selected ? (
              <p className="mt-2 text-muted">{t('admin.audit.detailEmpty')}</p>
            ) : (
              <dl className="mt-3 space-y-2">
                <Detail label={t('admin.audit.colAction')} value={selected.action} />
                <Detail
                  label={t('admin.audit.colWhen')}
                  value={new Date(selected.createdAt).toLocaleString()}
                />
                <Detail
                  label={t('admin.audit.colActor')}
                  value={selected.actorDisplayName ?? selected.actorEmail ?? '—'}
                />
                <Detail label={t('admin.audit.colEntity')} value={selected.entityType} />
                <Detail label="entityId" value={selected.entityId ?? '—'} />
                <Detail label="requestId" value={selected.requestId ?? '—'} />
                <Detail
                  label={t('admin.audit.colThesis')}
                  value={selected.thesisTitle ?? selected.thesisId ?? '—'}
                />
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                    {t('admin.audit.metadata')}
                  </dt>
                  <dd className="mt-1 overflow-x-auto rounded bg-canvas px-2 py-2 font-mono text-xs text-ink">
                    {selected.metadata
                      ? JSON.stringify(selected.metadata, null, 2)
                      : t('admin.audit.metadataEmpty')}
                  </dd>
                </div>
              </dl>
            )}
          </aside>
        </div>
      ) : null}

      {list.data && list.data.total > 0 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
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
              disabled={(params.page ?? 1) <= 1}
              onClick={() =>
                setParams((current) => ({ ...current, page: (current.page ?? 1) - 1 }))
              }
            >
              {t('admin.users.prev')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={(params.page ?? 1) >= totalPages}
              onClick={() =>
                setParams((current) => ({ ...current, page: (current.page ?? 1) + 1 }))
              }
            >
              {t('admin.users.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink break-all">{value}</dd>
    </div>
  );
}
