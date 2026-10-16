import { Link, useNavigate } from 'react-router-dom';
import { Button, Modal, Skeleton } from '@thesispartner/ui';
import { useState } from 'react';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatShortDay } from '../../dashboard/labels';
import { useDeleteObjective, useUpdateObjective, useObjective } from '../hooks/use-objectives';
import { ObjectiveForm } from './ObjectiveForm';
import { ObjectiveStatusBadge } from './ObjectiveStatusBadge';
import { ObjectiveTasks } from './ObjectiveTasks';
import { QueryError, queryErrorMessage } from './QueryError';

export function ObjectiveDetailView({
  thesisId,
  objectiveId,
  canManage,
  studentView = false,
  backTo,
}: {
  thesisId: string;
  objectiveId: string;
  canManage: boolean;
  studentView?: boolean;
  backTo: string;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const objective = useObjective(thesisId, objectiveId);
  const update = useUpdateObjective(thesisId, objectiveId);
  const remove = useDeleteObjective(thesisId);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (objective.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (objective.isError || !objective.data) return <QueryError error={objective.error} />;

  const data = objective.data;
  const locked = studentView && data.completionReview.status === 'APPROVED';
  const canRevise = canManage && !locked;
  const active = data.taskSummary.total - data.taskSummary.cancelled;
  const deliverablesBase = backTo.endsWith('/objectifs')
    ? backTo.replace(/\/objectifs$/, '/livrables')
    : backTo.startsWith('/encadrement/')
      ? `${backTo}/livrables`
      : '/livrables';
  const deliverablesHref = `${deliverablesBase}?objectiveId=${objectiveId}`;

  return (
    <article className="min-w-0 w-full">
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <Link
              to={backTo}
              aria-label={t('objectives.detail.backAria')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:bg-canvas"
            >
              <span aria-hidden="true">←</span>
            </Link>
            <ProgressRing value={data.progress} />
            <div className="min-w-0">
              <h1 className="break-words text-base font-semibold tracking-tight text-ink sm:text-lg">
                {data.title}
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                {data.dueDate
                  ? formatShortDay(data.dueDate, dateLocale)
                  : t('objectives.detail.noDueDate')}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <ObjectiveStatusBadge status={data.status} />
                {data.isOverdue ? (
                  <span className="rounded-full bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">
                    {t('objectives.overdue')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {canRevise ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t('common.edit')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </Button>
            </div>
          ) : null}
        </div>
        {data.description ? (
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">{data.description}</p>
        ) : null}
      </section>

      {data.isOverdue ? (
        <div
          className="mt-3 rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3"
          role="status"
        >
          <p className="text-xs font-semibold text-warn">
            {t('objectives.detail.overdueOn', { title: data.title })}
          </p>
          <p className="mt-0.5 text-xs text-warn">
            {t('objectives.detail.progressAction', { progress: data.progress })}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label={t('objectives.detail.stepsCompleted')}
          value={`${data.taskSummary.done} / ${active}`}
        />
        <Metric
          label={t('objectives.detail.inProgress')}
          value={String(data.taskSummary.inProgress)}
        />
        <Metric label={t('objectives.detail.todo')} value={String(data.taskSummary.todo)} />
        <Metric
          label={t('objectives.detail.dueDate')}
          value={data.dueDate ? formatShortDay(data.dueDate, dateLocale) : '—'}
          accent
        />
      </div>

      <ObjectiveTasks
        thesisId={thesisId}
        objective={data}
        canManage={canRevise}
        canReview={canManage && !studentView}
        deliverablesHref={deliverablesHref}
      />

      <Modal
        open={editing}
        title={t('objectives.edit')}
        closeLabel={t('common.close')}
        onClose={() => setEditing(false)}
      >
        <ObjectiveForm
          initial={data}
          progressLocked={data.progressMode === 'TASK_BASED'}
          submitLabel={t('objectives.form.save')}
          pending={update.isPending}
          error={update.error}
          onSubmit={async (body) => {
            const next =
              data.progressMode === 'TASK_BASED' ? { ...body, progress: undefined } : body;
            await update.mutateAsync(next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <Modal
        open={confirmDelete}
        title={t('objectives.delete')}
        closeLabel={t('common.close')}
        onClose={() => setConfirmDelete(false)}
      >
        <p className="text-sm text-ink">
          {t('objectives.detail.deleteBody', { title: data.title })}
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
              void remove.mutateAsync(objectiveId).then(() => navigate(backTo));
            }}
          >
            {t('common.delete')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </article>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-2">
      <p className={`text-sm font-semibold tabular-nums ${accent ? 'text-brand' : 'text-ink'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">{label}</p>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const t = useT();
  const progress = Math.min(100, Math.max(0, value));
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#2563eb ${progress * 3.6}deg, #e2e8f0 0deg)`,
      }}
      role="img"
      aria-label={t('objectives.detail.progressAria', { progress })}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-[10px] font-semibold tabular-nums text-ink">
        {progress}
      </span>
    </div>
  );
}
