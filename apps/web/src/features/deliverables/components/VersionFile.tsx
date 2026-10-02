import { Button } from '@thesispartner/ui';
import { useRef, useState } from 'react';
import { ApiClientError } from '../../../api/client';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { en } from '../../../i18n/messages/en';
import { formatMessage, getMessage, type MessageKey } from '../../../i18n/translate';
import type { DeliverableVersion } from '../hooks/use-deliverables';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function defaultT(key: MessageKey, params?: Record<string, string | number>): string {
  return formatMessage(getMessage(en, key), params);
}

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'txt',
  'csv',
  'zip',
  'json',
]);

const TYPE_LABEL: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/zip': 'ZIP',
  'application/json': 'JSON',
};

export function localFileError(file: File, t: Translate = defaultT): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return t('deliverables.fileTooLarge');
  }
  const extension = file.name.replace(/\\/g, '/').split('/').pop()?.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return t('deliverables.fileTypeNotAllowed');
  }
  return null;
}

export function fileErrorMessage(error: unknown, t: Translate = defaultT): string {
  if (!(error instanceof ApiClientError)) return t('errors.unavailable');
  if (error.body.code === 'FILE_TYPE_NOT_ALLOWED') return t('deliverables.fileTypeNotAllowed');
  if (error.body.code === 'FILE_TOO_LARGE') return error.body.message;
  if (error.body.code === 'FILE_SIGNATURE_MISMATCH') {
    return t('deliverables.fileSignatureMismatch');
  }
  if (error.body.code === 'VERSION_FILE_ALREADY_EXISTS') {
    return t('deliverables.versionFileExists');
  }
  if (error.body.code === 'FORBIDDEN') return t('errors.forbidden');
  if (error.body.code === 'NOT_FOUND') return t('errors.notFound');
  if (error.body.code === 'RATE_LIMITED') return error.body.message;
  return t('errors.unavailable');
}

export function formatFileSize(sizeBytes: number, locale = 'en-US'): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}

export function readableFileType(mimeType: string, t: Translate = defaultT): string {
  return TYPE_LABEL[mimeType] ?? t('deliverables.genericFile');
}

export function FilePicker({
  label,
  busy,
  progress,
  onFile,
}: {
  label: string;
  busy: boolean;
  progress: string | null;
  onFile: (file: File) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function accept(file: File | undefined) {
    if (!file) return;
    const problem = localFileError(file, t);
    setLocalError(problem);
    if (!problem) onFile(file);
  }

  return (
    <div
      className="mt-3 min-w-0 rounded-md border border-dashed border-line p-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        accept(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label={t('common.chooseFile')}
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      <p className="mt-2 text-sm text-muted">{t('deliverables.uploadHint')}</p>
      {progress ? <p className="mt-2 text-sm text-ink">{progress}</p> : null}
      {localError ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}

export function VersionFileDetails({
  file,
  downloading,
  onDownload,
}: {
  file: NonNullable<DeliverableVersion['file']>;
  downloading: boolean;
  onDownload: () => void;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  return (
    <div className="mt-3 min-w-0 border-t border-line pt-3">
      <p className="text-sm text-muted">{t('common.fileLabel')}</p>
      <p className="mt-1 break-words text-sm text-ink">{file.originalName}</p>
      <p className="mt-1 text-sm text-muted">
        {formatFileSize(file.sizeBytes, dateLocale)} · {readableFileType(file.mimeType, t)} ·{' '}
        {formatUploadDay(file.createdAt, dateLocale)}
      </p>
      <div className="mt-2">
        <Button type="button" variant="secondary" disabled={downloading} onClick={onDownload}>
          {t('common.download')}
        </Button>
      </div>
    </div>
  );
}

function formatUploadDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
