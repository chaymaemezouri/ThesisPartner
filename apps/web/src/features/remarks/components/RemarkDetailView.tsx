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
  const audience = canCreate ? 'supervisor' : 'student';

  const created = new Date(data.createdAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' });

  return (
    <article className="min-w-0">
      <nav className="mb-2 text-[11px] text-muted" aria-label={t('common.breadcrumb')}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.to}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <Link to={crumb.to} className="text-brand hover:underline">
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{data.title}</span>
      </nav>

      <section className="overflow-hidden rounded-md border border-line bg-surface">
        <header className="border-b border-line px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-base font-semibold tracking-tight text-ink">
              {data.title}
            </h1>
            <RemarkStatusBadge status={data.status} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {data.author.givenName} {data.author.familyName}
            <span aria-hidden="true"> · </span>
            {data.target.label}
            <span aria-hidden="true"> · </span>
            <time dateTime={data.createdAt}>{created}</time>
            {data.location?.trim() ? (
              <>
                <span aria-hidden="true"> · </span>
                {data.location}
              </>
            ) : null}
          </p>
          <p className="mt-2 text-xs leading-snug text-muted">
            {t(`remarks.next.${audience}.${data.status}`)}
          </p>
        </header>

        <div className="px-4 py-3.5" aria-labelledby="remark-message">
          <h2 id="remark-message" className="sr-only">
            {t('remarks.remark')}
          </h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
            {data.message}
          </p>
          {data.correctionVersion ? (
            <p className="mt-3 text-xs text-muted" aria-label={t('remarks.correctionAria')}>
              {t('remarks.correctionLinked')}
              <span aria-hidden="true"> · </span>
              <span className="text-ink">
                {data.correctionVersion.deliverableTitle} · V{data.correctionVersion.versionNumber}
              </span>
            </p>
          ) : null}
        </div>

        <section className="border-t border-line px-4 py-3" aria-labelledby="remark-thread">
          <h2
            id="remark-thread"
            className="text-[11px] font-medium tracking-wide text-muted uppercase"
          >
            {t('remarks.exchanges')}
          </h2>
          {data.replies.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted">{t('remarks.noThread')}</p>
          ) : (
            <ol className="mt-2" aria-label={t('remarks.conversationAria')}>
              {data.replies.map((item) => (
                <li key={item.id} className="border-l border-line py-1.5 pl-3">
                  <p className="text-[11px] text-muted">
                    <span className="font-medium text-ink">
                      {item.author.givenName} {item.author.familyName}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
                    </time>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                    {item.message}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {canReplyAction ? (
          <form
            className="border-t border-line px-4 py-3"
            aria-labelledby="remark-reply"
            onSubmit={async (event) => {
              event.preventDefault();
              await reply.mutateAsync({ message });
              setMessage('');
            }}
          >
            <h2 id="remark-reply" className="sr-only">
              {t('remarks.reply')}
            </h2>
            <Textarea
              id="reply-message"
              label={t('remarks.reply')}
              value={message}
              rows={3}
              maxLength={4000}
              required
              className="!min-h-16 text-sm"
              onChange={(event) => setMessage(event.target.value)}
            />
            {reply.error ? (
              <p className="mt-2 text-xs text-danger" role="alert">
                {queryErrorMessage(reply.error, t)}
              </p>
            ) : null}
            <div className="mt-2">
              <Button type="submit" className="h-8 px-3 text-xs" disabled={reply.isPending}>
                {t('remarks.sendReply')}
              </Button>
            </div>
          </form>
        ) : null}

        {canResolveAction ? (
          <section
            className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-between"
            aria-label={t('remarks.correctionSectionAria')}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink">{t('remarks.correctionDone')}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                {t('remarks.correctionHelp')}
              </p>
              {data.deliverableId && versionOptions.length > 0 ? (
                <div className="mt-2 max-w-sm">
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
            </div>
            <Button
              className="h-8 w-fit shrink-0 self-start px-3 text-xs"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(correctionVersionId ? { correctionVersionId } : {})}
            >
              {t('remarks.correctionDone')}
            </Button>
            {resolve.error ? (
              <p className="w-full text-xs text-danger" role="alert">
                {queryErrorMessage(resolve.error, t)}
              </p>
            ) : null}
          </section>
        ) : null}

        {canCloseAction || canReopenAction ? (
          <section
            className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3"
            aria-label={t('remarks.supervisorActionsAria')}
          >
            {canCloseAction ? (
              <Button
                className="h-8 px-3 text-xs"
                disabled={close.isPending}
                onClick={() => close.mutate()}
              >
                {t('remarks.close')}
              </Button>
            ) : null}
            {canReopenAction ? (
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs"
                disabled={reopen.isPending}
                onClick={() => reopen.mutate()}
              >
                {t('remarks.reopen')}
              </Button>
            ) : null}
            {close.error || reopen.error ? (
              <p className="w-full text-xs text-danger" role="alert">
                {queryErrorMessage(close.error ?? reopen.error, t)}
              </p>
            ) : null}
          </section>
        ) : null}
      </section>
    </article>
  );
}
