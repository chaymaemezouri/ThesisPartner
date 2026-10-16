import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Input, Modal, Select, Textarea } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import {
  createTaskSchema,
  deliverableListSchema,
  deliverableSchema,
  deliverableVersionSchema,
  storedFileSchema,
} from '@thesispartner/validation';
import { useRef, useState } from 'react';
import { apiGet, apiSend, apiUpload } from '../../../api/client';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import type { MessageKey } from '../../../i18n/translate';
import { fileErrorMessage } from '../../deliverables/components/VersionFile';
import { formatDay } from '../../dashboard/labels';
import type { Objective } from '../hooks/use-objectives';
import {
  useApproveObjectiveCompletion,
  useCreateTask,
  useDeleteTask,
  useObjectiveTasks,
  useReorderTasks,
  useRequestObjectiveChanges,
  useRequestObjectiveCompletion,
  useUpdateTask,
  type Task,
  type TaskDraft,
} from '../hooks/use-tasks';
import { TASK_STATUS_LABEL } from '../labels';
import { QueryError, queryErrorMessage } from './QueryError';

const STUDENT_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export function ObjectiveTasks({
  thesisId,
  objective,
  canManage,
  canReview,
  deliverablesHref,
}: {
  thesisId: string;
  objective: Objective;
  canManage: boolean;
  canReview: boolean;
  deliverablesHref: string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const queryClient = useQueryClient();
  const tasks = useObjectiveTasks(thesisId, objective.id);
  const create = useCreateTask(thesisId, objective.id);
  const update = useUpdateTask(thesisId, objective.id);
  const remove = useDeleteTask(thesisId, objective.id);
  const reorder = useReorderTasks(thesisId, objective.id);
  const request = useRequestObjectiveCompletion(thesisId, objective.id);
  const approve = useApproveObjectiveCompletion(thesisId, objective.id);
  const changes = useRequestObjectiveChanges(thesisId, objective.id);
  const [composer, setComposer] = useState<'create' | Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const frozen = objective.status === 'COMPLETED' || objective.status === 'CANCELLED';
  const active = objective.taskSummary.total - objective.taskSummary.cancelled;
  const rows = tasks.data?.tasks ?? [];
  const selected =
    rows.find((task) => task.id === selectedId) ??
    rows.find((task) => task.status !== 'DONE' && task.status !== 'CANCELLED') ??
    rows[0] ??
    null;
  const selectedIndex = selected ? rows.findIndex((task) => task.id === selected.id) : -1;

  return (
    <div className="mt-4 grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section
        className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
        aria-labelledby="taches-titre"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="taches-titre" className="text-sm font-semibold text-ink">
              {t('objectives.detail.tasksTitle')}
            </h2>
            {objective.progressMode === 'TASK_BASED' ? (
              <p className="mt-0.5 text-xs text-muted">
                {t('objectives.stepsDone', { done: objective.taskSummary.done, active })}
              </p>
            ) : null}
          </div>
          {canManage && !frozen ? (
            <IconAction
              label={t('objectives.detail.newStep')}
              icon="plus"
              onClick={() => setComposer('create')}
            />
          ) : null}
        </div>
        {selected ? (
          <StepActions
            task={selected}
            index={selectedIndex}
            total={rows.length}
            canManage={canManage}
            frozen={frozen}
            pending={update.isPending || reorder.isPending}
            onStatus={(status) => {
              if (status === selected.status) return;
              void update.mutate({ taskId: selected.id, body: { status } });
            }}
            onMove={(direction) => move(rows, selectedIndex, direction, reorder.mutate)}
          />
        ) : null}
        {tasks.isLoading ? (
          <p className="mt-4 text-sm text-muted" aria-busy="true">
            {t('objectives.detail.loadingTasks')}
          </p>
        ) : null}
        {tasks.isError ? <QueryError error={tasks.error} /> : null}
        {tasks.data && tasks.data.tasks.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {canManage
              ? t('objectives.detail.emptyTasksManage')
              : t('objectives.detail.emptyTasksReadonly')}
          </p>
        ) : null}
        {tasks.data && tasks.data.tasks.length > 0 ? (
          <ol className="relative mt-4 space-y-2 border-l-2 border-brand/30 pl-5">
            {tasks.data.tasks.map((task) => {
              const isSelected = selected?.id === task.id;
              return (
                <li key={task.id} className="relative min-w-0">
                  <StepNode status={task.status} />
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      isSelected ? 'border-brand bg-brand-soft' : 'border-line bg-canvas'
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={task.title}
                      onClick={() => setSelectedId(task.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`block break-words text-xs font-medium text-ink ${task.status === 'CANCELLED' ? 'text-muted line-through' : ''}`}
                      >
                        {task.title}
                      </span>
                      {task.dueDate ? (
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {t('objectives.detail.duePrefix', {
                            date: formatDay(task.dueDate, dateLocale),
                          })}
                        </span>
                      ) : null}
                    </button>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-warn">
                      {stepProgress(task.status)} %
                    </span>
                    {canManage && !frozen ? (
                      <>
                        <button
                          type="button"
                          aria-label={`${t('common.edit')} ${task.title}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-warn hover:bg-warn-soft"
                          onClick={() => setComposer(task)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`${t('common.delete')} ${task.title}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-danger hover:bg-danger-soft"
                          onClick={() => setPendingDelete(task)}
                        >
                          <TrashIcon />
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
      <aside className="grid gap-3">
        <CompletionPanel
          objective={objective}
          canReview={canReview}
          reason={reason}
          onReason={setReason}
          requestPending={request.isPending}
          approvePending={approve.isPending}
          changesPending={changes.isPending}
          error={request.error ?? approve.error ?? changes.error}
          onRequest={() => request.mutate()}
          onApprove={() => approve.mutate()}
          onChanges={() => changes.mutate(reason)}
        />
        <LinkCard href={deliverablesHref} />
      </aside>
      <Modal
        open={composer !== null}
        title={
          composer === 'create'
            ? t('objectives.detail.newStepTitle')
            : t('objectives.detail.editStepTitle')
        }
        closeLabel={t('common.close')}
        onClose={() => setComposer(null)}
      >
        {composer ? (
          <TaskForm
            initial={composer === 'create' ? null : composer}
            pending={create.isPending || update.isPending}
            error={create.error ?? update.error}
            onCancel={() => setComposer(null)}
            onSubmit={async (body, file) => {
              let taskId: string;
              if (composer === 'create') {
                const created = await create.mutateAsync(body);
                taskId = created.id;
              } else {
                await update.mutateAsync({ taskId: composer.id, body });
                taskId = composer.id;
              }
              if (file) {
                await attachTaskDeliverable({
                  thesisId,
                  objectiveId: objective.id,
                  taskId,
                  title: body.title,
                  dueDate: body.dueDate ?? null,
                  file,
                });
                await queryClient.invalidateQueries({
                  queryKey: ['deliverables', 'list', thesisId],
                });
                await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              }
              setComposer(null);
            }}
          />
        ) : null}
      </Modal>
      <Modal
        open={pendingDelete !== null}
        title={t('objectives.detail.deleteStepTitle')}
        closeLabel={t('common.close')}
        onClose={() => setPendingDelete(null)}
      >
        {pendingDelete ? (
          <div>
            <p className="text-sm text-ink">
              {t('objectives.detail.deleteStepConfirm', { title: pendingDelete.title })}
            </p>
            {remove.error ? (
              <p className="mt-3 text-sm text-danger" role="alert">
                {queryErrorMessage(remove.error, t)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={remove.isPending}
                onClick={() => {
                  void remove.mutateAsync(pendingDelete.id).then(() => setPendingDelete(null));
                }}
              >
                {t('common.delete')}
              </Button>
              <Button variant="secondary" onClick={() => setPendingDelete(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function StepActions({
  task,
  index,
  total,
  canManage,
  frozen,
  pending,
  onStatus,
  onMove,
}: {
  task: Task;
  index: number;
  total: number;
  canManage: boolean;
  frozen: boolean;
  pending: boolean;
  onStatus: (status: Task['status']) => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 rounded-xl border border-line bg-canvas p-3">
      <p className="text-sm font-medium text-ink">{task.title}</p>
      {task.description ? <p className="mt-1 text-sm text-muted">{task.description}</p> : null}
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`task-status-${task.id}`}>
          {t('objectives.detail.statusOf', { title: task.title })}
        </label>
        <select
          id={`task-status-${task.id}`}
          className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          value={task.status}
          disabled={frozen || pending || (!canManage && task.status === 'CANCELLED')}
          onChange={(event) => onStatus(event.target.value as Task['status'])}
        >
          {statusOptions(canManage, task.status).map((status) => (
            <option key={status} value={status}>
              {t(`objectives.taskStatus.${status}` as MessageKey)}
            </option>
          ))}
        </select>
        {canManage && !frozen ? (
          <>
            <Button
              variant="secondary"
              aria-label={`${t('objectives.detail.moveUp')} ${task.title}`}
              disabled={index === 0 || pending}
              onClick={() => onMove(-1)}
            >
              {t('objectives.detail.moveUp')}
            </Button>
            <Button
              variant="secondary"
              aria-label={`${t('objectives.detail.moveDown')} ${task.title}`}
              disabled={index === total - 1 || pending}
              onClick={() => onMove(1)}
            >
              {t('objectives.detail.moveDown')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 13h6l1-13" strokeLinejoin="round" />
    </svg>
  );
}

function StepNode({ status }: { status: Task['status'] }) {
  const done = status === 'DONE';
  const current = status === 'IN_PROGRESS';
  return (
    <span
      aria-hidden="true"
      className={`absolute -left-[1.65rem] top-4 grid h-4 w-4 place-items-center rounded-full border-2 border-surface ${
        done ? 'bg-ok' : current ? 'bg-warn' : 'bg-surface ring-2 ring-line'
      }`}
    >
      {done ? <span className="text-[9px] font-bold text-white">✓</span> : null}
    </span>
  );
}

function stepProgress(status: Task['status']): number {
  if (status === 'DONE') return 100;
  if (status === 'IN_PROGRESS') return 50;
  if (status === 'CANCELLED') return 0;
  return 0;
}

function LinkCard({ href }: { href: string }) {
  const t = useT();
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <h2 className="text-xs font-semibold text-ink">
        {t('objectives.detail.linkedDeliverables')}
      </h2>
      <p className="mt-1 text-xs text-muted">{t('objectives.detail.linkedDeliverablesHelp')}</p>
      <p className="mt-3">
        <Link to={href} className="text-sm font-medium text-brand">
          {t('objectives.detail.seeDeliverables')}
        </Link>
      </p>
    </section>
  );
}

function CompletionPanel({
  objective,
  canReview,
  reason,
  onReason,
  requestPending,
  approvePending,
  changesPending,
  error,
  onRequest,
  onApprove,
  onChanges,
}: {
  objective: Objective;
  canReview: boolean;
  reason: string;
  onReason: (value: string) => void;
  requestPending: boolean;
  approvePending: boolean;
  changesPending: boolean;
  error: unknown;
  onRequest: () => void;
  onApprove: () => void;
  onChanges: () => void;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const review = objective.completionReview;
  if (objective.status === 'COMPLETED') {
    return (
      <section
        className="rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
        aria-label={t('objectives.detail.validation')}
      >
        <p className="text-sm font-medium text-ink">{t('objectives.detail.completed')}</p>
        {review.validatedByName ? (
          <p className="mt-2 text-sm text-ink">
            {t('objectives.detail.validatedBy', { name: review.validatedByName })}
          </p>
        ) : null}
        {review.validatedAt ? (
          <p className="mt-1 text-sm text-muted">
            {t('objectives.detail.date', {
              date: new Date(review.validatedAt).toLocaleDateString(dateLocale, {
                timeZone: 'UTC',
              }),
            })}
          </p>
        ) : null}
      </section>
    );
  }
  if (objective.status === 'CANCELLED') return null;

  return (
    <section
      className="rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
      aria-label={t('objectives.detail.validation')}
    >
      {review.status === 'CHANGES_REQUESTED' ? (
        <p className="text-sm text-ink">{t('objectives.detail.changesRequested')}</p>
      ) : null}
      {review.message ? <p className="mt-2 text-sm text-ink">{review.message}</p> : null}
      {canReview && review.status === 'PENDING' ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">
            {t('objectives.detail.validationRequested')}
          </p>
          <Textarea
            id="review-message"
            label={t('objectives.detail.message')}
            value={reason}
            maxLength={500}
            onChange={(event) => onReason(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={changesPending} onClick={onChanges}>
              {t('objectives.detail.requestChanges')}
            </Button>
            <Button disabled={approvePending} onClick={onApprove}>
              {t('objectives.detail.approve')}
            </Button>
          </div>
        </div>
      ) : null}
      {!canReview && review.status === 'PENDING' ? (
        <p className="text-sm font-medium text-ink">{t('objectives.detail.validationPending')}</p>
      ) : null}
      {!canReview && review.status !== 'PENDING' ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          {objective.progress < 100 ? (
            <p className="text-sm text-muted">{t('objectives.detail.finishTasks')}</p>
          ) : null}
          <Button disabled={objective.progress < 100 || requestPending} onClick={onRequest}>
            {t('objectives.detail.requestValidation')}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
    </section>
  );
}

function TaskForm({
  initial,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial: Task | null;
  pending: boolean;
  error: unknown;
  onSubmit: (body: TaskDraft, file?: File) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [status, setStatus] = useState<Task['status']>(initial?.status ?? 'TODO');
  const [file, setFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const body = {
          title,
          description,
          dueDate: dueDate || null,
          status,
        };
        const parsed = createTaskSchema.safeParse(body);
        if (!parsed.success) {
          setFieldError(parsed.error.issues[0]?.message ?? t('common.requiredField'));
          return;
        }
        setFieldError(null);
        setFileError(null);
        setSubmitting(true);
        void onSubmit(parsed.data, file ?? undefined)
          .catch((caught: unknown) => {
            setFileError(fileErrorMessage(caught, t));
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <Input
        id="task-title"
        label={t('objectives.form.title')}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldError ?? undefined}
        required
      />
      <Textarea
        id="task-description"
        label={t('objectives.form.description')}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Input
        id="task-due"
        label={t('objectives.form.dueDate')}
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
      />
      <Select
        id="task-initial-status"
        label={t('objectives.form.status')}
        value={status}
        onChange={(event) => setStatus(event.target.value as Task['status'])}
      >
        {(Object.keys(TASK_STATUS_LABEL) as Array<keyof typeof TASK_STATUS_LABEL>).map((value) => (
          <option key={value} value={value}>
            {t(`objectives.taskStatus.${value}`)}
          </option>
        ))}
      </Select>
      <div className="rounded-lg border border-dashed border-line p-3">
        <p className="text-sm font-medium text-ink">{t('objectives.detail.optionalDeliverable')}</p>
        <p className="mt-0.5 text-xs text-muted">
          {t('objectives.detail.optionalDeliverableHelp')}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            const problem = next ? localTaskFileError(next, t) : null;
            setFileError(problem);
            setFile(problem ? null : next);
            event.target.value = '';
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
            {file ? t('common.changeFile') : t('common.attachFile')}
          </Button>
          {file ? (
            <span className="truncate text-sm text-ink">{file.name}</span>
          ) : (
            <span className="text-sm text-muted">{t('common.noFile')}</span>
          )}
        </div>
      </div>
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
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || submitting}>
          {initial ? t('objectives.detail.saveStep') : t('objectives.detail.addStep')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

function localTaskFileError(
  file: File,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string | null {
  if (file.size > 50 * 1024 * 1024) return t('objectives.detail.fileTooLarge');
  const ok =
    /\.(pdf|docx?)$/i.test(file.name) ||
    file.type === 'application/pdf' ||
    file.type === 'application/msword' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return ok ? null : t('objectives.detail.fileFormats');
}

async function attachTaskDeliverable(input: {
  thesisId: string;
  objectiveId: string;
  taskId: string;
  title: string;
  dueDate: string | null;
  file: File;
}) {
  const list = await apiGet(
    `/api/v1/theses/${input.thesisId}/deliverables?objectiveId=${input.objectiveId}`,
    deliverableListSchema,
  );
  const existing = list.deliverables.find((item) => item.taskId === input.taskId);
  let deliverableId = existing?.id;
  if (!deliverableId) {
    const created = await apiSend(
      `/api/v1/theses/${input.thesisId}/deliverables`,
      deliverableSchema,
      {
        title: input.title,
        type: 'REPORT',
        objectiveId: input.objectiveId,
        taskId: input.taskId,
        dueDate: input.dueDate,
        description: `Livrable de l’étape « ${input.title} »`,
      },
    );
    deliverableId = created.id;
  }
  const version = await apiSend(
    `/api/v1/theses/${input.thesisId}/deliverables/${deliverableId}/versions`,
    deliverableVersionSchema,
    { changeSummary: 'Fichier joint depuis l’étape' },
  );
  await apiUpload(
    `/api/v1/theses/${input.thesisId}/deliverables/${deliverableId}/versions/${version.id}/file`,
    storedFileSchema,
    input.file,
  );
}

function statusOptions(canManage: boolean, current: Task['status']): readonly Task['status'][] {
  if (canManage) return Object.keys(TASK_STATUS_LABEL) as Task['status'][];
  if (current === 'CANCELLED') return ['CANCELLED'];
  return STUDENT_STATUSES;
}

function move(
  tasks: Task[],
  index: number,
  direction: -1 | 1,
  reorder: (items: { taskId: string; position: number }[]) => void,
) {
  const next = tasks.slice();
  const target = index + direction;
  const current = next[index];
  const swapped = next[target];
  if (!current || !swapped) return;
  next[index] = swapped;
  next[target] = current;
  reorder(next.map((task, position) => ({ taskId: task.id, position: position + 1 })));
}
