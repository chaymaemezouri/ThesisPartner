import { Button, Modal, Skeleton } from '@thesispartner/ui';
import { useState } from 'react';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { QueryError } from '../../objectives/components/QueryError';
import {
  useCreateDeliverableVersion,
  useDownloadDeliverableFile,
  useDeliverableVersions,
  useUploadDeliverableFile,
  type DeliverableVersion,
} from '../hooks/use-deliverables';
import { FilePicker, VersionFileDetails, fileErrorMessage } from './VersionFile';
import { VersionForm } from './VersionForm';

export function DeliverableVersionHistory({
  thesisId,
  deliverableId,
  canCreate,
}: {
  thesisId: string;
  deliverableId: string;
  canCreate: boolean;
}) {
  const t = useT();
  const versions = useDeliverableVersions(thesisId, deliverableId);
  const create = useCreateDeliverableVersion(thesisId, deliverableId);
  const upload = useUploadDeliverableFile(thesisId, deliverableId);
  const download = useDownloadDeliverableFile(thesisId, deliverableId);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = versions.data?.versions ?? [];
  const latest = rows.reduce((max, row) => Math.max(max, row.versionNumber), 0);
  const hasVersions = rows.length > 0;

  async function attach(versionId: string, file: File) {
    setNotice(null);
    setProgress(t('common.uploading'));
    try {
      await upload.mutateAsync({
        versionId,
        file,
        onProgress: (loaded, total) => {
          if (total > 0) {
            setProgress(
              t('common.uploadingProgress', { percent: Math.round((loaded / total) * 100) }),
            );
          }
        },
      });
      setProgress(null);
    } catch (error) {
      setProgress(null);
      setNotice(fileErrorMessage(error, t));
      throw error;
    }
  }

  return (
    <section
      className="mt-3 min-w-0 overflow-hidden rounded-md border border-line bg-surface"
      aria-labelledby="versions-titre"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0">
          <h2 id="versions-titre" className="text-sm font-semibold text-ink">
            {t('deliverables.versions')}
            {hasVersions ? (
              <span className="ml-2 text-[11px] font-normal text-muted">
                {rows.length === 1
                  ? t('deliverables.versionCountOne')
                  : t('deliverables.versionCountMany', { count: rows.length })}
              </span>
            ) : null}
          </h2>
        </div>
        {canCreate && hasVersions ? (
          <Button className="h-8 px-2.5 text-xs" onClick={() => setOpen(true)}>
            {t('deliverables.addVersion')}
          </Button>
        ) : null}
      </div>

      {notice ? (
        <p className="border-b border-line px-3 py-2 text-xs text-danger" role="alert">
          {notice}
        </p>
      ) : null}

      {versions.isLoading ? (
        <div className="space-y-2 px-3 py-2.5" aria-busy="true">
          <Skeleton className="h-10" />
        </div>
      ) : null}

      {versions.isError ? (
        <div className="px-3 py-2.5">
          <QueryError error={versions.error} />
        </div>
      ) : null}

      {versions.data && !hasVersions ? (
        <div className="px-3 py-2.5">
          <p className="text-xs text-ink">{t('deliverables.noVersions')}</p>
          <p className="mt-0.5 text-[11px] text-muted">{t('deliverables.versionHint')}</p>
          {canCreate ? (
            <div className="mt-2">
              <Button className="h-8 px-2.5 text-xs" onClick={() => setOpen(true)}>
                {t('deliverables.firstVersion')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasVersions ? (
        <ol className="divide-y divide-line" aria-label={t('deliverables.historyAria')}>
          {rows.map((row) => (
            <VersionRow
              key={row.id}
              version={row}
              latest={row.versionNumber === latest}
              canUpload={canCreate}
              progress={
                upload.isPending && upload.variables?.versionId === row.id ? progress : null
              }
              downloading={download.isPending && download.variables === row.id}
              onDownload={() => download.mutate(row.id)}
              onUpload={(file) => attach(row.id, file).catch(() => undefined)}
            />
          ))}
        </ol>
      ) : null}

      <Modal
        open={open}
        title={hasVersions ? t('deliverables.newVersion') : t('deliverables.firstVersionTitle')}
        closeLabel={t('common.close')}
        onClose={() => {
          create.reset();
          setOpen(false);
        }}
      >
        <VersionForm
          requiresSummary={hasVersions}
          pending={create.isPending || upload.isPending}
          progress={progress}
          error={create.error}
          onCancel={() => setOpen(false)}
          onSubmit={async (body, file) => {
            const created = await create.mutateAsync(body);
            setOpen(false);
            if (!file) return;
            await attach(created.id, file).catch(() => undefined);
          }}
        />
      </Modal>
    </section>
  );
}

function VersionRow({
  version,
  latest,
  canUpload,
  progress,
  downloading,
  onDownload,
  onUpload,
}: {
  version: DeliverableVersion;
  latest: boolean;
  canUpload: boolean;
  progress: string | null;
  downloading: boolean;
  onDownload: () => void;
  onUpload: (file: File) => void;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  return (
    <li className="px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="min-w-0 text-xs text-ink">
          <span className="font-semibold tabular-nums">V{version.versionNumber}</span>
          {latest ? (
            <span className="ml-1.5 text-[11px] text-muted">{t('deliverables.latestVersion')}</span>
          ) : null}
          {version.changeSummary ? (
            <span className="ml-1.5 text-[11px] text-muted">— {version.changeSummary}</span>
          ) : null}
        </p>
        <time className="shrink-0 text-[11px] tabular-nums text-muted" dateTime={version.createdAt}>
          {formatVersionDay(version.createdAt, dateLocale)}
        </time>
      </div>
      {version.file ? (
        <div className="mt-1.5">
          <VersionFileDetails
            file={version.file}
            downloading={downloading}
            onDownload={onDownload}
          />
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-muted">{t('deliverables.fileMissingHint')}</p>
          {canUpload ? (
            <FilePicker
              label={t('deliverables.addFile')}
              busy={false}
              progress={progress}
              onFile={onUpload}
            />
          ) : null}
        </div>
      )}
    </li>
  );
}

function formatVersionDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
