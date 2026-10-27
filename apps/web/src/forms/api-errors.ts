import type { ApiErrorCode } from '@thesispartner/types';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiClientError } from '../api/client';
import type { MessageKey } from '../i18n/translate';

type Translate = (key: MessageKey) => string;

const MESSAGE_KEY: Partial<Record<ApiErrorCode, MessageKey>> = {
  BAD_REQUEST: 'errors.badRequest',
  UNAUTHORIZED: 'errors.invalidCredentials',
  CONFLICT: 'errors.accountExists',
  VALIDATION_ERROR: 'errors.validation',
  RATE_LIMITED: 'errors.rateLimited',
  FORBIDDEN: 'errors.forbidden',
  NOT_FOUND: 'errors.accountNotFound',
  STORAGE_UNAVAILABLE: 'errors.storageUnavailable',
  PAYLOAD_TOO_LARGE: 'errors.payloadTooLarge',
  FILE_TOO_LARGE: 'deliverables.fileTooLarge',
  FILE_TYPE_NOT_ALLOWED: 'deliverables.fileTypeNotAllowed',
  FILE_SIGNATURE_MISMATCH: 'deliverables.fileSignatureMismatch',
  SUBSCRIPTION_REQUIRED: 'errors.subscriptionRequired',
};

export function formErrorMessage(error: unknown, t: Translate): string {
  if (error instanceof ApiClientError) {
    if (error.body.message === 'This person is already a member') {
      return t('errors.alreadyMember');
    }
    if (error.body.message === 'You cannot assign this role') {
      return t('errors.cannotAssignRole');
    }
    const key = MESSAGE_KEY[error.body.code];
    return key ? t(key) : t('errors.unavailable');
  }
  return t('errors.unavailable');
}

export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!(error instanceof ApiClientError)) return;
  for (const field of error.body.errors) {
    setError(field.field as Path<T>, { message: field.message });
  }
}
