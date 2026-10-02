import { Button, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { ApiClientError } from '../../../api/client';
import { applyFieldErrors } from '../../../forms/api-errors';
import { useZodForm } from '../../../forms/use-zod-form';
import { useT } from '../../../i18n/LocaleContext';
import type { MessageKey } from '../../../i18n/translate';
import { versionFormSchema } from '../schemas/version-form';
import { FilePicker } from './VersionFile';

export function VersionForm({
  requiresSummary,
  pending,
  progress,
  error,
  onSubmit,
  onCancel,
}: {
  requiresSummary: boolean;
  pending: boolean;
  progress: string | null;
  error: unknown;
  onSubmit: (body: { changeSummary?: string }, file: File | null) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const form = useZodForm(versionFormSchema(requiresSummary), {
    defaultValues: { changeSummary: '' },
  });
  const [file, setFile] = useState<File | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit(async (values) => {
        const changeSummary = values.changeSummary.trim();
        try {
          await onSubmit(changeSummary ? { changeSummary } : {}, file);
        } catch (caught) {
          applyFieldErrors(caught, form.setError);
        }
      })}
    >
      <Textarea
        id="version-summary"
        label={t('deliverables.versionSummary')}
        hint={
          requiresSummary
            ? t('deliverables.versionSummaryRequired')
            : t('deliverables.versionSummaryOptional')
        }
        placeholder={t('deliverables.versionSummaryPlaceholder')}
        {...form.register('changeSummary')}
        error={form.formState.errors.changeSummary?.message}
      />
      <FilePicker
        label={file ? file.name : t('common.chooseFile')}
        busy={pending}
        progress={progress}
        onFile={setFile}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {versionErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {t('deliverables.saveVersion')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.close')}
        </Button>
      </div>
    </form>
  );
}

function versionErrorMessage(
  error: unknown,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string {
  if (!(error instanceof ApiClientError)) return t('errors.unavailable');
  if (error.body.code === 'CONFLICT') {
    return t('deliverables.versionConflict');
  }
  if (error.body.code === 'FORBIDDEN') return t('errors.forbidden');
  if (error.body.code === 'NOT_FOUND') return t('errors.notFound');
  if (error.body.code === 'UNAUTHORIZED') return t('errors.unauthorized');
  if (error.body.code === 'VALIDATION_ERROR') {
    return error.body.errors[0]?.message ?? t('errors.validation');
  }
  if (error.body.code === 'BAD_REQUEST') return error.body.message;
  return t('errors.unavailable');
}
