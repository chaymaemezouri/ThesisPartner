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
  const current = rows
    .filter((row) => row.file)
    .reduce<(typeof rows)[number] | null>(
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
      className="mt-3 min-w-0 overflow-hidden rounded-md border border-line bg-surface"
      aria-labelledby="document-titre"
    >
      <header className="border-b border-line px-3 py-2">
        <h2 id="document-titre" className="text-sm font-semibold text-ink">
          {t('deliverables.document')}
        </h2>
      </header>

      {versions.isLoading ? (
        <div className="px-3 py-2.5" aria-busy="true">
          <Skeleton className="h-12" />
        </div>
      ) : null}

      {versions.isError ? (
        <div className="px-3 py-2.5">
          <QueryError error={versions.error} />
        </div>
      ) : null}

      {versions.data && !file ? (
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-canvas text-muted">
            <Icon name="deliverables" className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted">{t('deliverables.documentEmpty')}</p>
        </div>
      ) : null}

      {file && current ? (
        <div className="px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
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
              className="h-8 shrink-0 px-3 text-xs"
              disabled={download.isPending && download.variables === current.id}
              onClick={() => download.mutate(current.id)}
            >
              {t('common.download')}
            </Button>
          </div>
          {previewable && preview.data?.url ? (
            <iframe
              title={t('deliverables.documentPreview')}
              src={preview.data.url}
              className="mt-3 h-[32rem] w-full rounded-md border border-line bg-canvas"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
