import { useEffect, useState } from 'react';
import { Button } from '@thesispartner/ui';
import { useT } from '../../../i18n/LocaleContext';

/**
 * In-app PDF preview via a same-origin (or credentialed) API stream.
 * Embedding a cross-origin S3 signed URL in an iframe makes Chromium/Edge
 * download the file and leave a blank preview pane.
 */
export function PdfPreview({
  contentPath,
  openUrl,
}: {
  /** Authenticated API path that streams the PDF (`…/file/content`). */
  contentPath: string;
  /** Optional signed/open URL for “open in a new tab”. */
  openUrl?: string;
}) {
  const t = useT();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let created: string | undefined;
    setBlobUrl(null);
    setFailed(false);
    void (async () => {
      try {
        const base = import.meta.env.VITE_API_URL ?? '';
        const response = await fetch(`${base}${contentPath}`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/pdf,*/*' },
        });
        if (!response.ok) throw new Error(`preview ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const blob = new Blob([buffer], { type: 'application/pdf' });
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [contentPath, attempt]);

  const external = openUrl ?? blobUrl;

  return (
    <section
      aria-label={t('deliverables.documentPreview')}
      className="mt-3 overflow-hidden rounded-lg border border-line bg-canvas"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 text-xs">
        <span className="font-medium text-ink">{t('deliverables.documentPreview')}</span>
        <div className="flex flex-wrap items-center gap-3">
          {failed ? (
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-2.5 text-xs"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('deliverables.previewRetry')}
            </Button>
          ) : null}
          {external ? (
            <a
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              {t('deliverables.previewOpen')}
            </a>
          ) : null}
        </div>
      </div>
      {blobUrl && !failed ? (
        <iframe
          title={t('deliverables.documentPreview')}
          src={blobUrl}
          className="h-[min(82vh,56rem)] w-full bg-white"
        />
      ) : failed ? (
        <div role="alert" className="space-y-3 px-4 py-10 text-center text-sm text-muted">
          <p>{t('deliverables.previewError')}</p>
          {external ? (
            <a
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex font-medium text-brand hover:underline"
            >
              {t('deliverables.previewOpen')}
            </a>
          ) : null}
        </div>
      ) : (
        <p role="status" className="py-16 text-center text-xs text-muted">
          {t('common.loading')}
        </p>
      )}
    </section>
  );
}
