import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminThesisRelationsSchema } from '@thesispartner/validation';
import { apiGet, ApiClientError } from '../../api/client';
import { useT } from '../../i18n/LocaleContext';

export function AdminThesisRelationsPage() {
  const t = useT();
  const { thesisId } = useParams<{ thesisId: string }>();
  const detail = useQuery({
    queryKey: ['admin', 'thesis-relations', thesisId],
    queryFn: () => apiGet(`/api/v1/admin/theses/${thesisId}/relations`, adminThesisRelationsSchema),
    enabled: Boolean(thesisId),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/invitations" className="text-sm text-muted hover:text-ink">
          {t('common.back')}
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {detail.data?.thesisTitle ?? t('admin.invitations.relations')}
        </h1>
        <p className="mt-1 text-sm text-muted">{t('admin.invitations.relationsHelp')}</p>
      </div>

      {detail.isLoading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : detail.isError ? (
        <p className="text-sm text-danger" role="alert">
          {detail.error instanceof ApiClientError ? detail.error.body.message : t('errors.generic')}
        </p>
      ) : detail.data ? (
        <>
          <section className="rounded-md border border-line bg-surface px-4 py-4">
            <h2 className="text-sm font-medium text-ink">{t('admin.invitations.members')}</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {detail.data.members.map((member) => (
                <li key={`${member.userId}-${member.role}`} className="py-2">
                  <p className="font-medium text-ink">{member.displayName}</p>
                  <p className="text-muted">
                    {member.email} · {member.role}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-line bg-surface px-4 py-4">
            <h2 className="text-sm font-medium text-ink">{t('admin.invitations.title')}</h2>
            {detail.data.invitations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('admin.invitations.empty')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {detail.data.invitations.map((item) => (
                  <li key={item.id} className="py-2">
                    <p className="font-medium text-ink">{item.email}</p>
                    <p className="text-muted">
                      {item.status} · {item.role}
                      {item.replacesSupervisor ? ` · ${t('invitations.replacesBadge')}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-line bg-surface px-4 py-4">
            <h2 className="text-sm font-medium text-ink">{t('admin.invitations.history')}</h2>
            {detail.data.supervisionHistory.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('admin.invitations.historyEmpty')}</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {detail.data.supervisionHistory.map((item) => (
                  <li key={item.id} className="py-2">
                    <p className="font-medium text-ink">{item.supervisorName}</p>
                    <p className="text-muted">
                      {item.supervisorEmail} · {item.endedReason}
                      {item.changeReason ? ` · ${item.changeReason}` : ''}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(item.startedAt).toLocaleDateString()} →{' '}
                      {new Date(item.endedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
