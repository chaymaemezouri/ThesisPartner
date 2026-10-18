import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Textarea } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import type { IconName } from '../../../routes/nav';
import {
  deliverableSchema,
  deliverableVersionSchema,
  fileDownloadSchema,
  storedFileSchema,
} from '@thesispartner/validation';
import { useRef, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '../../../api/client';
import { useT } from '../../../i18n/LocaleContext';
import type { MessageKey } from '../../../i18n/translate';
import {
  useDeliverableVersions,
  useDeliverables,
} from '../../deliverables/hooks/use-deliverables';
import { fileErrorMessage } from '../../deliverables/components/VersionFile';
import type { Task } from '../hooks/use-tasks';
import {
  useStepTaskMutations,
  useStepTasks,
  type StepTask,
} from '../hooks/use-step-tasks';
import { QueryError, queryErrorMessage } from './QueryError';

export type StepPanel = 'tasks' | 'files' | 'remarks';
const EDITABLE = new Set(['DRAFT', 'CHANGES_REQUESTED', 'REJECTED']);

export function WorkIcon({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string;
  icon: IconName;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
        pressed ? 'bg-brand text-white' : 'text-brand hover:bg-brand-soft'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

export function WorkCount({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-md px-1 text-xs font-semibold tabular-nums ${
        pressed ? 'bg-brand text-white' : 'bg-surface text-ink hover:bg-brand-soft'
      }`}
    >
      {count}
    </button>
  );
}

export function StepWorkPanel({
  thesisId,
  objectiveId,
  step,
  panel,
  canEditStep,
  canEdit,
  canReview,
}: {
  thesisId: string;
  objectiveId: string;
  step: Task;
  panel: StepPanel;
  canEditStep: boolean;
  canEdit: boolean;
  canReview: boolean;
}) {
  const t = useT();
  const work = useStepTasks(thesisId, objectiveId, step.id);

  return (
    <section className="mt-2 rounded-xl border border-line bg-surface p-3" aria-label={t('objectives.work.actions')}>
      {work.isError ? <QueryError error={work.error} /> : null}
      {panel === 'tasks' ? (
        <TaskList
          thesisId={thesisId}
          objectiveId={objectiveId}
          stepId={step.id}
          tasks={work.data?.tasks ?? []}
          canEdit={canEdit}
          canReview={canReview}
        />
      ) : null}
      {panel === 'files' ? (
        <StepFiles thesisId={thesisId} objectiveId={objectiveId} step={step} canEdit={canEditStep} />
      ) : null}
      {panel === 'remarks' ? (
        <RemarkList remarks={work.data?.remarks ?? []} empty={t('objectives.work.emptyRemarks')} />
      ) : null}
    </section>
  );
}

function TaskList({
  thesisId,
  objectiveId,
  stepId,
  tasks,
  canEdit,
  canReview,
}: {
  thesisId: string;
  objectiveId: string;
  stepId: string;
  tasks: StepTask[];
  canEdit: boolean;
  canReview: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const mutations = useStepTaskMutations(thesisId, objectiveId, stepId);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['step-tasks', thesisId, objectiveId, stepId] });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StepTask | null>(null);
  const [opened, setOpened] = useState<{ id: string; section: 'files' | 'remarks' } | null>(null);
  const done = tasks.filter((task) => task.status === 'VALIDATED');
  const open = tasks.filter((task) => task.status !== 'VALIDATED');

  return (
    <div className="mt-3">
      {canEdit ? (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          {t('objectives.work.add')}
        </Button>
      ) : null}
      {creating ? (
        <TaskEditor
          pending={mutations.create.isPending}
          error={mutations.create.error}
          onCancel={() => setCreating(false)}
          onSave={async (body, file) => {
            const created = await mutations.create.mutateAsync(body);
            if (file && created.deliverableId) {
              await attachFile(thesisId, created.deliverableId, file);
              await refresh();
            }
            setCreating(false);
          }}
        />
      ) : null}
      {tasks.length === 0 && !creating ? (
        <p className="mt-3 text-sm text-muted">{t('objectives.work.emptyTasks')}</p>
      ) : null}
      <TaskGroup title={t('objectives.work.openWork')} tasks={open} />
      <TaskGroup title={t('objectives.work.done')} tasks={done} />
      {tasks.map((task) => {
        const editable = canEdit && EDITABLE.has(task.status);
        const section = opened?.id === task.id ? opened.section : null;
        return (
          <article key={task.id} className="mt-2 rounded-xl border border-line bg-canvas px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="min-w-0 max-w-full truncate text-left text-xs font-medium text-ink"
                onClick={() => setOpened({ id: task.id, section: 'files' })}
              >
                {task.title}
              </button>
              <WorkIcon
                label={t('objectives.work.taskDeliverable')}
                icon="deliverables"
                pressed={section === 'files'}
                onClick={() => setOpened({ id: task.id, section: 'files' })}
              />
              <WorkIcon
                label={t('objectives.work.viewRemarks')}
                icon="remarks"
                pressed={section === 'remarks'}
                onClick={() => setOpened({ id: task.id, section: 'remarks' })}
              />
              <WorkCount
                label={t('objectives.work.remarkCount', { count: task.remarks.length })}
                count={task.remarks.length}
                pressed={section === 'remarks'}
                onClick={() => setOpened({ id: task.id, section: 'remarks' })}
              />
              <span className="ml-auto shrink-0 text-[11px] font-medium text-brand">
                {t(`objectives.work.status.${task.status}` as MessageKey)}
              </span>
              {editable ? (
                <>
                  <button
                    type="button"
                    aria-label={`${t('common.edit')} ${task.title}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-warn hover:bg-warn-soft"
                    onClick={() => {
                      setEditing(task);
                      setOpened({ id: task.id, section: 'files' });
                    }}
                  >
                    <Icon name="pencil" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t('common.delete')} ${task.title}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-danger hover:bg-danger-soft"
                    disabled={mutations.remove.isPending}
                    onClick={() => mutations.remove.mutate(task.id)}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
            {section ? (
              <div className="mt-2 border-t border-line pt-2">
                {task.description ? <p className="text-sm text-muted">{task.description}</p> : null}
                {task.reviewMessage ? <p className="mt-1 text-sm text-ink">{task.reviewMessage}</p> : null}
                {section === 'files' ? (
                  <FileList
                    thesisId={thesisId}
                    deliverableId={task.deliverableId}
                    files={task.files}
                    canEdit={editable}
                    onRemove={(versionId) => mutations.removeFile.mutate({ id: task.id, versionId })}
                    onAttach={async (file) => {
                      if (!task.deliverableId) return;
                      await attachFile(thesisId, task.deliverableId, file);
                      await refresh();
                    }}
                  />
                ) : (
                  <RemarkList remarks={task.remarks} empty={t('objectives.work.emptyRemarks')} />
                )}
                {editing?.id === task.id ? (
                  <TaskEditor
                    initial={task}
                    pending={mutations.update.isPending}
                    error={mutations.update.error}
                    onCancel={() => setEditing(null)}
                    onSave={async (body) => {
                      await mutations.update.mutateAsync({ id: task.id, ...body });
                      setEditing(null);
                    }}
                  />
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {editable ? (
                    <Button disabled={mutations.submit.isPending} onClick={() => mutations.submit.mutate(task.id)}>
                      {t('objectives.work.submit')}
                    </Button>
                  ) : null}
                  {canReview && (task.status === 'SUBMITTED' || task.status === 'IN_REVIEW') ? (
                    <ReviewActions
                      pending={mutations.review.isPending || mutations.remark.isPending}
                      error={mutations.review.error ?? mutations.remark.error}
                      onDecision={(decision, message) =>
                        mutations.review.mutate({ id: task.id, decision, message })
                      }
                      onRemark={(message) => mutations.remark.mutate({ id: task.id, message })}
                      canExamine={task.status === 'SUBMITTED'}
                    />
                  ) : null}
                </div>
                {mutations.submit.error && mutations.submit.variables === task.id ? (
                  <p className="mt-2 text-sm text-danger" role="alert">
                    {queryErrorMessage(mutations.submit.error, t)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: StepTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <p className="mt-3 text-xs font-medium text-muted">
      {title} · {tasks.length}
    </p>
  );
}

function TaskEditor({
  initial,
  pending,
  error,
  onSave,
  onCancel,
}: {
  initial?: StepTask;
  pending: boolean;
  error: unknown;
  onSave: (body: { title: string; description?: string }, file?: File) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [file, setFile] = useState<File | null>(null);
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({ title, description }, file ?? undefined);
      }}
    >
      <Input id={`work-title-${initial?.id ?? 'new'}`} label={t('objectives.form.title')} value={title} onChange={(event) => setTitle(event.target.value)} required />
      <Textarea id={`work-description-${initial?.id ?? 'new'}`} label={t('objectives.form.description')} value={description} onChange={(event) => setDescription(event.target.value)} />
      {initial ? null : <FilePicker file={file} onFile={setFile} />}
      {error ? <p className="text-sm text-danger" role="alert">{queryErrorMessage(error, t)}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{t('objectives.work.save')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

function ReviewActions({
  pending,
  error,
  canExamine,
  onDecision,
  onRemark,
}: {
  pending: boolean;
  error: unknown;
  canExamine: boolean;
  onDecision: (decision: 'IN_REVIEW' | 'VALIDATED' | 'CHANGES_REQUESTED' | 'REJECTED', message?: string) => void;
  onRemark: (message: string) => void;
}) {
  const t = useT();
  const [message, setMessage] = useState('');
  return (
    <div className="grid w-full gap-2">
      <Textarea id="work-review" label={t('objectives.work.addRemark')} value={message} placeholder={t('objectives.work.remarkPlaceholder')} onChange={(event) => setMessage(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        {canExamine ? (
          <Button variant="secondary" disabled={pending} onClick={() => onDecision('IN_REVIEW', message)}>
            {t('objectives.work.examine')}
          </Button>
        ) : null}
        <Button disabled={pending} onClick={() => onDecision('VALIDATED', message)}>
          {t('objectives.work.validate')}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onDecision('CHANGES_REQUESTED', message)}>
          {t('objectives.work.requestChanges')}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => onDecision('REJECTED', message)}>
          {t('objectives.work.reject')}
        </Button>
        <Button variant="secondary" disabled={pending || message.trim().length === 0} onClick={() => onRemark(message.trim())}>
          {t('objectives.work.addRemark')}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{queryErrorMessage(error, t)}</p> : null}
    </div>
  );
}

function StepFiles({
  thesisId,
  objectiveId,
  step,
  canEdit,
}: {
  thesisId: string;
  objectiveId: string;
  step: Task;
  canEdit: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const list = useDeliverables(thesisId, { objectiveId });
  const deliverable = list.data?.deliverables.find((item) => item.taskId === step.id) ?? null;
  const versions = useDeliverableVersions(thesisId, deliverable?.id ?? null);
  const mutations = useStepTaskMutations(thesisId, objectiveId, step.id);
  const files = (versions.data?.versions ?? []).flatMap((version) =>
    version.file
      ? [{ versionId: version.id, versionNumber: version.versionNumber, originalName: version.file.originalName, mimeType: version.file.mimeType }]
      : [],
  );
  return (
    <div className="mt-3">
      <FileList
        thesisId={thesisId}
        deliverableId={deliverable?.id ?? null}
        files={files}
        canEdit={canEdit}
        onRemove={(versionId) => mutations.removeStepFile.mutate(versionId)}
        onAttach={async (file) => {
          const deliverableId =
            deliverable?.id ?? (await createStepDeliverable(thesisId, objectiveId, step)).id;
          await attachFile(thesisId, deliverableId, file);
          await queryClient.invalidateQueries({ queryKey: ['deliverables', 'list', thesisId] });
          await queryClient.invalidateQueries({ queryKey: ['deliverables', 'versions', thesisId] });
        }}
      />
      {files.length === 0 ? <p className="mt-2 text-sm text-muted">{t('objectives.work.emptyFiles')}</p> : null}
    </div>
  );
}

function FileList({
  thesisId,
  deliverableId,
  files,
  canEdit,
  onRemove,
  onAttach,
}: {
  thesisId: string;
  deliverableId: string | null;
  files: Array<{ versionId: string; versionNumber: number; originalName: string; mimeType: string }>;
  canEdit: boolean;
  onRemove: (versionId: string) => void;
  onAttach: (file: File) => Promise<void>;
}) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-2">
      <ul className="grid gap-1">
        {files.map((item) => (
          <li key={item.versionId} className="flex max-w-full items-center gap-1">
            <span className="min-w-0 truncate text-sm text-ink">
              v{item.versionNumber} · {item.originalName}
            </span>
            {canPreview(item.mimeType) ? (
              <FileAction
                label={t('objectives.work.open')}
                icon="eye"
                onClick={() => void openFile(thesisId, deliverableId, item.versionId, true)}
              />
            ) : null}
            <FileAction
              label={t('objectives.work.download')}
              icon="download"
              onClick={() => void openFile(thesisId, deliverableId, item.versionId, false)}
            />
            {canEdit ? (
              <FileAction
                label={t('objectives.work.removeFile')}
                icon="trash"
                tone="danger"
                onClick={() => onRemove(item.versionId)}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <FilePicker file={file} onFile={setFile} />
          <Button
            variant="secondary"
            disabled={!file}
            onClick={() => {
              if (!file) return;
              setError(null);
              void onAttach(file)
                .then(() => setFile(null))
                .catch((caught: unknown) => setError(fileErrorMessage(caught, t)));
            }}
          >
            {files.length > 0 ? t('objectives.work.replace') : t('common.attachFile')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

function FileAction({
  label,
  icon,
  tone = 'brand',
  onClick,
}: {
  label: string;
  icon: IconName;
  tone?: 'brand' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
        tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-brand hover:bg-brand-soft'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

function FilePicker({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      <Button type="button" variant="secondary" onClick={() => input.current?.click()}>
        {file ? t('common.changeFile') : t('common.attachFile')}
      </Button>
      <span className="truncate text-sm text-muted">{file?.name ?? t('common.noFile')}</span>
    </div>
  );
}

function RemarkList({
  remarks,
  empty,
}: {
  remarks: Array<{ id: string; title: string; message: string; authorName: string }>;
  empty: string;
}) {
  if (remarks.length === 0) return <p className="mt-2 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-2 grid gap-2">
      {remarks.map((remark) => (
        <li key={remark.id} className="rounded-md border border-line bg-canvas px-3 py-2">
          <p className="text-xs font-medium text-muted">{remark.authorName} · {remark.title}</p>
          <p className="mt-1 text-sm text-ink">{remark.message}</p>
        </li>
      ))}
    </ul>
  );
}

function canPreview(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

async function openFile(
  thesisId: string,
  deliverableId: string | null,
  versionId: string,
  inline: boolean,
) {
  if (!deliverableId) return;
  const download = await apiGet(
    `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions/${versionId}/file/download${inline ? '?inline=1' : ''}`,
    fileDownloadSchema,
  );
  window.open(download.url, '_blank', 'noopener');
}

async function createStepDeliverable(thesisId: string, objectiveId: string, step: Task) {
  return apiSend(`/api/v1/theses/${thesisId}/deliverables`, deliverableSchema, {
    title: step.title,
    type: 'REPORT',
    objectiveId,
    taskId: step.id,
    description: `Livrable de l’étape « ${step.title} »`,
  });
}

async function attachFile(thesisId: string, deliverableId: string, file: File) {
  const version = await apiSend(
    `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions`,
    deliverableVersionSchema,
    { changeSummary: file.name },
  );
  await apiUpload(
    `/api/v1/theses/${thesisId}/deliverables/${deliverableId}/versions/${version.id}/file`,
    storedFileSchema,
    file,
  );
}
