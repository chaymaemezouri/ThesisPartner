import { useT } from '../../../i18n/LocaleContext';
import { en } from '../../../i18n/messages/en';
import { getMessage, type MessageKey } from '../../../i18n/translate';
import { ApiClientError } from '../../../api/client';

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

function defaultT(key: MessageKey): string {
  return getMessage(en, key);
}

export function QueryError({ error }: { error: unknown }) {
  const t = useT();
  return (
    <p className="text-sm text-danger" role="alert">
      {queryErrorMessage(error, t)}
    </p>
  );
}

export function queryErrorMessage(error: unknown, t: Translate = defaultT): string {
  if (!(error instanceof ApiClientError)) return t('errors.unavailable');
  if (error.body.code === 'NOT_FOUND') return t('errors.notFound');
  if (error.body.code === 'UNAUTHORIZED') return t('errors.unauthorized');
  if (error.body.code === 'FORBIDDEN') return t('errors.forbidden');
  if (error.body.code === 'SUBSCRIPTION_REQUIRED') return t('billing.readonlyHelp');
  if (error.body.code === 'STORAGE_UNAVAILABLE') return t('errors.storageUnavailable');
  if (error.body.code === 'PAYLOAD_TOO_LARGE' || error.body.code === 'FILE_TOO_LARGE') {
    return t('deliverables.fileTooLarge');
  }
  if (error.body.code === 'FILE_TYPE_NOT_ALLOWED') return t('deliverables.fileTypeNotAllowed');
  if (error.body.code === 'VALIDATION_ERROR') return t('errors.validation');
  return t('errors.unavailable');
}
