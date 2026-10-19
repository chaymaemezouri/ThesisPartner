import { Button, Input, Select, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { useT } from '../../../i18n/LocaleContext';
import { queryErrorMessage } from '../../objectives/components/QueryError';
import type { RemarkDraft } from '../hooks/use-remarks';

type Option = { id: string; title: string };

export function RemarkForm({
  objectives,
  deliverables,
  pending,
  error,
  fixed,
  onCancel,
  onSubmit,
}: {
  objectives: Option[];
  deliverables: Option[];
  pending: boolean;
  error: unknown;
  fixed?: {
    objectiveId?: string | null;
    taskId?: string | null;
    deliverableId?: string | null;
    label?: string;
  };
  onCancel: () => void;
  onSubmit: (body: RemarkDraft) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [deliverableId, setDeliverableId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit({
            title,
            message,
            location: location.trim() || undefined,
            objectiveId: fixed ? (fixed.objectiveId ?? null) : objectiveId || null,
            taskId: fixed?.taskId ?? null,
            deliverableId: fixed ? (fixed.deliverableId ?? null) : deliverableId || null,
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Input
        id="remark-title"
        label={t('remarks.form.title')}
        value={title}
        maxLength={200}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        id="remark-message"
        label={t('remarks.form.message')}
        value={message}
        maxLength={4000}
        required
        onChange={(event) => setMessage(event.target.value)}
      />
      {fixed?.label ? <p className="text-sm font-medium text-ink">{fixed.label}</p> : null}
      {fixed ? null : (
        <>
          <Select
            id="remark-objective"
            label={t('remarks.form.objective')}
            value={objectiveId}
            onChange={(event) => setObjectiveId(event.target.value)}
          >
            <option value="">{t('common.none')}</option>
            {objectives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
          <Select
            id="remark-deliverable"
            label={t('remarks.form.deliverable')}
            value={deliverableId}
            onChange={(event) => setDeliverableId(event.target.value)}
          >
            <option value="">{t('common.none')}</option>
            {deliverables.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </Select>
        </>
      )}
      <Input
        id="remark-location"
        label={t('remarks.form.location')}
        value={location}
        maxLength={300}
        onChange={(event) => setLocation(event.target.value)}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || submitting}>
          {t('remarks.create')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
