import { Button, Skeleton } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import { useT } from '../../../i18n/LocaleContext';
import { QueryError } from '../../objectives/components/QueryError';
import {
  useDeliverableFilePreview,
  useDeliverableVersions,
  useDownloadDeliverableFile,
} from '../hooks/use-deliverables';
import { formatFileSize, readableFileType } from './VersionFile';
import { PdfPreview } from './PdfPreview';

const PREVIEWABLE = new Set(['application/pdf', 'text/plain', 'text/csv', 'application/json']);

export function DeliverableDocument({
  thesisId,
  deliverableId,
}: {
  thesisId: string;
  deliverableId: string;
}) {
  const t = useT();
  const versions = useDeliverableVersions(thesisId, deliverableId);
  const download = useDownloadDeliverableFile(thesisId, deliverableId);
  const rows = versions.data?.versions ?? [];
  const current = rows.reduce<(typeof rows)[number] | null>(
    (best, row) => (!best || row.versionNumber > best.versionNumber ? row : best),
    null,
  );
  const file = current?.file ?? null;
  const previewable = file ? PREVIEWABLE.has(file.mimeType) : false;
  const preview = useDeliverableFilePreview(
    thesisId,
    deliverableId,
    previewable && current ? current.id : null,
  );

  return (
    <section
      className="min-w-0 rounded-2xl border border-line/80 bg-surface p-4 shadow-[0_1px_4px_rgba(15,23,42,0.03)]"
      aria-labelledby="document-titre"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-canvas text-muted">
          <Icon name="deliverables" className="h-4 w-4" />
        </span>
        <h2 id="document-titre" className="text-sm font-semibold text-ink">
          {t('deliverables.document')}
        </h2>
      </header>

      {versions.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-16" />
        </div>
      ) : null}

      {versions.isError ? <QueryError error={versions.error} /> : null}

      {versions.data && !file ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-canvas/60 px-3 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-muted">
            <Icon name="deliverables" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{t('deliverables.documentEmpty')}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {current
                ? t('deliverables.currentVersionNoFile', { number: current.versionNumber })
                : t('deliverables.documentEmptyHelp')}
            </p>
          </div>
        </div>
      ) : null}

      {file && current ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/50 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon name="deliverables" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-ink">{file.originalName}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {readableFileType(file.mimeType, t)} · {formatFileSize(file.sizeBytes)} ·{' '}
                  {t('deliverables.documentFromVersion', { number: current.versionNumber })}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-8 shrink-0 px-3 text-xs shadow-none"
              disabled={download.isPending && download.variables === current.id}
              onClick={() => download.mutate(current.id)}
            >
              {t('common.download')}
            </Button>
          </div>
          {preview.isLoading ? (
            <p role="status" className="mt-3 text-xs text-muted">
              {t('common.loading')}
            </p>
          ) : null}
          {previewable && preview.data?.url && file.mimeType === 'application/pdf' ? (
            <PdfPreview key={preview.data.url} url={preview.data.url} />
          ) : previewable && preview.data?.url ? (
            <iframe
              title={t('deliverables.documentPreview')}
              src={preview.data.url}
              className="mt-3 h-[32rem] w-full rounded-md border border-line bg-canvas"
            />
          ) : null}
          {!previewable ? (
            <p className="mt-3 text-xs text-muted">{t('deliverables.documentNoPreview')}</p>
          ) : null}
          {preview.isError ? (
            <div className="mt-3">
              <QueryError error={preview.error} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
