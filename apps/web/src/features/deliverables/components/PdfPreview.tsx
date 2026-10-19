import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { Button } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import { useT } from '../../../i18n/LocaleContext';

export function PdfPreview({ url }: { url: string }) {
  const t = useT();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [rendering, setRendering] = useState(true);
  const [width, setWidth] = useState(0);
  const [pageText, setPageText] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(Math.floor(element.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let task: PDFDocumentLoadingTask | undefined;
    setPdf(null);
    setPageNumber(1);
    setFailed(false);
    setRendering(true);
    void (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        if (disposed) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        task = pdfjs.getDocument({ url });
        const document = await task.promise;
        if (!disposed) setPdf(document);
      } catch {
        if (!disposed) {
          setFailed(true);
          setRendering(false);
        }
      }
    })();
    return () => {
      disposed = true;
      void task?.destroy().catch(() => undefined);
    };
  }, [url, attempt]);

  useEffect(() => {
    if (!pdf || width <= 0) return;
    let disposed = false;
    let task: RenderTask | undefined;
    setRendering(true);
    setFailed(false);
    setPageText('');
    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (disposed) return;
        const natural = page.getViewport({ scale: 1 });
        const scale = Math.min(width / natural.width, 1.5);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * ratio });
        // A fresh canvas prevents an interrupted resize/page render from
        // competing with the next render for the same canvas.
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${viewport.width / ratio}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.className = 'mx-auto bg-white shadow-sm';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute(
          'aria-label',
          t('deliverables.previewPage', { page: pageNumber, total: pdf.numPages }),
        );
        task = page.render({ canvas, viewport });
        await task.promise;
        if (disposed) return;
        canvasHost.current?.replaceChildren(canvas);
        setRendering(false);
        const text = await page.getTextContent().catch(() => null);
        if (!disposed && text)
          setPageText(text.items.map((item) => ('str' in item ? item.str : '')).join(' '));
      } catch {
        if (!disposed) {
          setFailed(true);
          setRendering(false);
        }
      }
    })();
    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, width, t]);

  return (
    <section
      aria-label={t('deliverables.documentPreview')}
      className="mt-3 overflow-hidden rounded-lg border border-line bg-canvas"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 text-xs">
        <span className="font-medium text-ink">{t('deliverables.documentPreview')}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          {t('deliverables.previewOpen')}
        </a>
      </div>
      <div className="max-h-[40rem] overflow-y-auto p-3">
        <div ref={container} className="min-w-0" aria-busy={rendering}>
          {rendering && !failed ? (
            <p role="status" className="py-12 text-center text-xs text-muted">
              {t('common.loading')}
            </p>
          ) : null}
          {failed ? (
            <div role="alert" className="space-y-3 px-3 py-10 text-center text-xs text-muted">
              <p>{t('deliverables.previewError')}</p>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t('deliverables.previewRetry')}
              </Button>
            </div>
          ) : null}
          <div ref={canvasHost} className={rendering || failed ? 'hidden' : ''} />
          <p className="sr-only">{pageText}</p>
        </div>
      </div>
      {pdf && !failed ? (
        <div className="flex items-center justify-center gap-3 border-t border-line bg-surface px-3 py-2 text-xs">
          <button
            type="button"
            aria-label={t('deliverables.previewPrevious')}
            disabled={pageNumber === 1 || rendering}
            onClick={() => setPageNumber((page) => page - 1)}
            className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-brand-soft disabled:opacity-40"
          >
            <Icon name="back" className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="tabular-nums text-muted">
            {t('deliverables.previewPage', { page: pageNumber, total: pdf.numPages })}
          </span>
          <button
            type="button"
            aria-label={t('deliverables.previewNext')}
            disabled={pageNumber === pdf.numPages || rendering}
            onClick={() => setPageNumber((page) => page + 1)}
            className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-brand-soft disabled:opacity-40"
          >
            <Icon name="chevron" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
