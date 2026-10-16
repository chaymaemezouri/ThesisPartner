import { Button, Select, Skeleton, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { useDeliverableVersions } from '../../deliverables/hooks/use-deliverables';
import { QueryError, queryErrorMessage } from '../../objectives/components/QueryError';
import {
  useCloseRemark,
  useRemark,
  useReopenRemark,
  useReplyRemark,
  useResolveRemark,
} from '../hooks/use-remarks';
import { RemarkPriorityBadge } from './RemarkPriorityBadge';
import { RemarkStatusBadge } from './RemarkStatusBadge';

export function RemarkDetailView({
  thesisId,
  remarkId,
  canCreate,
  backTo,
  trail,
}: {
  thesisId: string;
  remarkId: string;
  canCreate: boolean;
  backTo: string;
  trail?: { label: string; to: string }[];
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const remark = useRemark(thesisId, remarkId);
  const reply = useReplyRemark(thesisId, remarkId);
  const resolve = useResolveRemark(thesisId, remarkId);
  const close = useCloseRemark(thesisId, remarkId);
  const reopen = useReopenRemark(thesisId, remarkId);
  const [message, setMessage] = useState('');
  const [correctionVersionId, setCorrectionVersionId] = useState('');
  const versions = useDeliverableVersions(thesisId, remark.data?.deliverableId ?? null);

  if (remark.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (remark.isError || !remark.data) return <QueryError error={remark.error} />;

  const data = remark.data;
  const crumbs = trail ?? [{ label: t('remarks.title'), to: backTo }];
  const canReplyAction = data.status !== 'CLOSED';
  const canResolveAction = !canCreate && (data.status === 'OPEN' || data.status === 'IN_PROGRESS');
  const canCloseAction = canCreate && data.status === 'RESOLVED';
  const canReopenAction = canCreate && (data.status === 'RESOLVED' || data.status === 'CLOSED');
  const versionOptions = versions.data?.versions ?? [];

  return (
    <article className="min-w-0 max-w-3xl">
      <nav className="mb-4 text-sm text-muted" aria-label={t('common.breadcrumb')}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.to}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <Link to={crumb.to} className="text-brand">
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden="true"> / </span>
        <span>{data.title}</span>
      </nav>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-2xl text-ink">{data.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {data.author.givenName} {data.author.familyName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RemarkStatusBadge status={data.status} />
          <RemarkPriorityBadge priority={data.priority} />
        </div>
      </header>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Field
          label={t('remarks.target')}
          value={`${t(`remarks.targetKind.${data.target.kind}`)} · ${data.target.label}`}
        />
        <Field label={t('remarks.priority')} value={t(`remarks.priorityLabel.${data.priority}`)} />
        <Field label={t('remarks.status')} value={t(`remarks.statusLabel.${data.status}`)} />
        <Field
          label={t('remarks.location')}
          value={data.location?.trim() ? data.location : t('remarks.locationNone')}
        />
        <Field
          label={t('remarks.createdOn')}
          value={new Date(data.createdAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
        />
        <Field
          label={t('remarks.lastActivity')}
          value={new Date(data.lastActivityAt).toLocaleDateString(dateLocale, {
            timeZone: 'UTC',
          })}
        />
      </dl>
      <section className="mt-8" aria-labelledby="remark-message">
        <h2 id="remark-message" className="text-sm font-medium text-ink">
          {t('remarks.remark')}
        </h2>
        <p className="mt-2 max-w-prose whitespace-pre-wrap break-words text-sm text-ink">
          {data.message}
        </p>
      </section>
      {data.correctionVersion ? (
        <section
          className="mt-6 rounded-md border border-line bg-surface px-3 py-3"
          aria-label={t('remarks.correctionAria')}
        >
          <p className="text-sm font-medium text-ink">{t('remarks.correctionLinked')}</p>
          <p className="mt-1 text-sm text-ink">
            {data.correctionVersion.deliverableTitle} · V{data.correctionVersion.versionNumber}
          </p>
        </section>
      ) : null}
      <section className="mt-8" aria-labelledby="remark-thread">
        <h2 id="remark-thread" className="text-sm font-medium text-ink">
          {t('remarks.exchanges')}
        </h2>
        {data.replies.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t('remarks.noThread')}</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2" aria-label={t('remarks.conversationAria')}>
            {data.replies.map((item) => (
              <li key={item.id} className="rounded-md border border-line bg-surface px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="font-medium text-ink">
                    {item.author.givenName} {item.author.familyName}
                  </p>
                  <time className="text-muted" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">
                  {item.message}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
      {canReplyAction ? (
        <section className="mt-8" aria-labelledby="remark-reply">
          <h2 id="remark-reply" className="text-sm font-medium text-ink">
            {t('remarks.reply')}
          </h2>
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await reply.mutateAsync({ message });
              setMessage('');
            }}
          >
            <Textarea
              id="reply-message"
              label={t('remarks.message')}
              value={message}
              maxLength={4000}
              required
              onChange={(event) => setMessage(event.target.value)}
            />
            {reply.error ? (
              <p className="text-sm text-danger" role="alert">
                {queryErrorMessage(reply.error, t)}
              </p>
            ) : null}
            <Button type="submit" disabled={reply.isPending}>
              {t('remarks.sendReply')}
            </Button>
          </form>
        </section>
      ) : null}
      {canResolveAction ? (
        <section
          className="mt-8 rounded-md border border-line bg-surface px-3 py-3"
          aria-label={t('remarks.correctionSectionAria')}
        >
          <p className="text-sm font-medium text-ink">{t('remarks.correctionDone')}</p>
          <p className="mt-1 text-sm text-muted">{t('remarks.correctionHelp')}</p>
          {data.deliverableId && versionOptions.length > 0 ? (
            <div className="mt-3">
              <Select
                id="correction-version"
                label={t('remarks.correctionVersion')}
                value={correctionVersionId}
                onChange={(event) => setCorrectionVersionId(event.target.value)}
              >
                <option value="">{t('common.none')}</option>
                {versionOptions.map((version) => (
                  <option key={version.id} value={version.id}>
                    V{version.versionNumber}
                    {version.changeSummary ? ` — ${version.changeSummary}` : ''}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {resolve.error ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {queryErrorMessage(resolve.error, t)}
            </p>
          ) : null}
          <div className="mt-3">
            <Button
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(correctionVersionId ? { correctionVersionId } : {})}
            >
              {t('remarks.correctionDone')}
            </Button>
          </div>
        </section>
      ) : null}
      {canCloseAction || canReopenAction ? (
        <section
          className="mt-8 flex flex-wrap gap-2"
          aria-label={t('remarks.supervisorActionsAria')}
        >
          {canCloseAction ? (
            <Button disabled={close.isPending} onClick={() => close.mutate()}>
              {t('remarks.close')}
            </Button>
          ) : null}
          {canReopenAction ? (
            <Button variant="secondary" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
              {t('remarks.reopen')}
            </Button>
          ) : null}
          {close.error || reopen.error ? (
            <p className="w-full text-sm text-danger" role="alert">
              {queryErrorMessage(close.error ?? reopen.error, t)}
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 break-words text-ink">{value}</dd>
    </div>
  );
}
