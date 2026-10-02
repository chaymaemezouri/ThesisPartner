import { Button, Input, Select, Textarea } from '@thesispartner/ui';
import { applyFieldErrors } from '../../../forms/api-errors';
import { useZodForm } from '../../../forms/use-zod-form';
import { useT } from '../../../i18n/LocaleContext';
import type { Objective, ObjectiveBody } from '../hooks/use-objectives';
import { STATUS_LABEL } from '../labels';
import {
  emptyObjectiveForm,
  objectiveFormSchema,
  toObjectiveBody,
  type ObjectiveFormValues,
} from '../schemas/objective-form';
import { queryErrorMessage } from './QueryError';

export function ObjectiveForm({
  initial,
  submitLabel,
  pending,
  error,
  progressLocked = false,
  onSubmit,
  onCancel,
}: {
  initial?: Objective | null;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  progressLocked?: boolean;
  onSubmit: (body: ObjectiveBody) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const form = useZodForm(objectiveFormSchema, {
    defaultValues: initial ? fromObjective(initial) : emptyObjectiveForm(),
  });

  return (
    <form
      className="grid gap-2.5"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await onSubmit(toObjectiveBody(values));
        } catch (caught) {
          applyFieldErrors(caught, form.setError);
        }
      })}
    >
      <Input
        id="objective-title"
        label={t('objectives.form.title')}
        {...form.register('title')}
        error={form.formState.errors.title?.message}
      />
      <Textarea
        id="objective-description"
        label={t('objectives.form.description')}
        rows={3}
        className="min-h-20"
        {...form.register('description')}
        error={form.formState.errors.description?.message}
      />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Select id="objective-status" label={t('objectives.form.status')} {...form.register('status')}>
          {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>)
            .filter(
              (value) =>
                !progressLocked || value !== 'COMPLETED' || initial?.status === 'COMPLETED',
            )
            .map((value) => (
              <option key={value} value={value}>
                {t(`objectives.status.${value}`)}
              </option>
            ))}
        </Select>
        {progressLocked ? (
          <div />
        ) : (
          <Input
            id="objective-progress"
            label={t('objectives.form.progressShort')}
            type="number"
            min={0}
            max={100}
            {...form.register('progress')}
            error={form.formState.errors.progress?.message}
          />
        )}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Input
          id="objective-start"
          label={t('objectives.form.startDate')}
          type="date"
          {...form.register('startDate')}
        />
        <Input
          id="objective-due"
          label={t('objectives.form.dueDate')}
          type="date"
          {...form.register('dueDate')}
          error={form.formState.errors.dueDate?.message}
        />
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function fromObjective(objective: Objective): ObjectiveFormValues {
  return {
    title: objective.title,
    description: objective.description ?? '',
    status: objective.status,
    startDate: objective.startDate ?? '',
    dueDate: objective.dueDate ?? '',
    progress: objective.progress,
  };
}
