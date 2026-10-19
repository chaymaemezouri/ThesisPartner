import { Button, Input, Select, Textarea } from '@thesispartner/ui';
import { useRef, useState } from 'react';
import { ApiClientError } from '../../../api/client';
import { applyFieldErrors } from '../../../forms/api-errors';
import { useZodForm } from '../../../forms/use-zod-form';
import { useT } from '../../../i18n/LocaleContext';
import { STATUS_LABEL } from '../../objectives/labels';
import type { Deliverable, DeliverableDraft } from '../hooks/use-deliverables';
import { DELIVERABLE_TYPE_LABEL } from '../labels';
import {
  deliverableFormSchema,
  emptyDeliverableForm,
  toDeliverableDraft,
  type DeliverableFormValues,
} from '../schemas/deliverable-form';
import { queryErrorMessage } from '../../objectives/components/QueryError';
import { fileErrorMessage, localFileError } from './VersionFile';

export function DeliverableForm({
  objectives,
  initial,
  pending,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  allowFile = false,
  savedDraft = false,
}: {
  objectives: { id: string; title: string; status: keyof typeof STATUS_LABEL }[];
  initial?: Deliverable | null;
  pending: boolean;
  error: unknown;
  submitLabel: string;
  onSubmit: (body: DeliverableDraft, file?: File, intent?: 'draft' | 'submit') => Promise<void>;
  onCancel: () => void;
  allowFile?: boolean;
  savedDraft?: boolean;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useZodForm(deliverableFormSchema, {
    defaultValues: initial ? fromDeliverable(initial) : emptyDeliverableForm(),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit(async (values, event) => {
        setFileError(null);
        setSubmitting(true);
        try {
          const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter;
          const intent =
            submitter instanceof HTMLButtonElement && submitter.value === 'submit'
              ? 'submit'
              : 'draft';
          await onSubmit(toDeliverableDraft(values), file ?? undefined, intent);
        } catch (caught) {
          applyFieldErrors(caught, form.setError);
          setFileError(
            caught instanceof ApiClientError && caught.body.code.startsWith('FILE_')
              ? fileErrorMessage(caught, t)
              : queryErrorMessage(caught, t),
          );
        } finally {
          setSubmitting(false);
        }
      })}
    >
      {allowFile && !initial ? (
        <p className="text-xs text-muted">
          {t(savedDraft ? 'deliverables.savedDraftHelp' : 'deliverables.depositHelp')}
        </p>
      ) : null}
      <fieldset disabled={pending || submitting} className="contents">
        <Input
          id="deliverable-title"
          label={t('deliverables.form.title')}
          {...form.register('title')}
          error={form.formState.errors.title?.message}
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Select
            id="deliverable-type"
            label={t('deliverables.form.type')}
            {...form.register('type')}
          >
            {(
              Object.keys(DELIVERABLE_TYPE_LABEL) as Array<keyof typeof DELIVERABLE_TYPE_LABEL>
            ).map((value) => (
              <option key={value} value={value}>
                {t(`deliverables.type.${value}`)}
              </option>
            ))}
          </Select>
          <Input
            id="deliverable-due"
            label={t('deliverables.form.dueDate')}
            type="date"
            {...form.register('dueDate')}
          />
        </div>
        <Textarea
          id="deliverable-description"
          label={t('deliverables.form.description')}
          rows={3}
          className="min-h-20"
          {...form.register('description')}
          error={form.formState.errors.description?.message}
        />
        <Select
          id="deliverable-objective"
          label={t('deliverables.linkedObjective')}
          {...form.register('objectiveId')}
          error={form.formState.errors.objectiveId?.message}
        >
          <option value="">{t('common.none')}</option>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title} · {t(`objectives.status.${objective.status}`)}
            </option>
          ))}
        </Select>
        {allowFile && !initial ? (
          <div className="rounded-md border border-dashed border-line p-2.5">
            <p className="text-sm font-medium text-ink">{t('deliverables.form.optionalFile')}</p>
            <p className="mt-0.5 text-xs text-muted">{t('deliverables.form.optionalFileHelp')}</p>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.json"
              className="sr-only"
              aria-label={t('common.chooseFile')}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                const problem = next ? localFileError(next, t) : null;
                setFileError(problem);
                setFile(problem ? null : next);
                event.target.value = '';
              }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
                {file ? t('common.changeFile') : t('common.uploadFile')}
              </Button>
              {file ? (
                <span className="truncate text-sm text-ink">{file.name}</span>
              ) : (
                <span className="text-sm text-muted">{t('common.noFile')}</span>
              )}
            </div>
          </div>
        ) : null}
        {fileError ? (
          <p className="text-sm text-danger" role="alert">
            {fileError}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {queryErrorMessage(error, t)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant={allowFile && !initial ? 'secondary' : 'primary'}
            disabled={pending || submitting}
          >
            {allowFile && !initial ? t('deliverables.saveDraft') : submitLabel}
          </Button>
          {allowFile && !initial ? (
            <Button type="submit" name="intent" value="submit" disabled={pending || submitting}>
              {t('deliverables.submit')}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('common.close')}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

function fromDeliverable(deliverable: Deliverable): DeliverableFormValues {
  return {
    title: deliverable.title,
    description: deliverable.description ?? '',
    type: deliverable.type,
    objectiveId: deliverable.objective?.id ?? '',
    dueDate: deliverable.dueDate ?? '',
  };
}
