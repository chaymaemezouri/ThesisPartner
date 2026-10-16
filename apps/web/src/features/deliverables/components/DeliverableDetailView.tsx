import { Button, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale, useT } from '../../../i18n/LocaleContext';
import { formatDay } from '../../dashboard/labels';
import { useObjectives } from '../../objectives/hooks/use-objectives';
import { QueryError, queryErrorMessage } from '../../objectives/components/QueryError';
import {
  useApproveDeliverable,
  useCancelDeliverable,
  useDeliverable,
  useRequestDeliverableChanges,
  useSubmitDeliverable,
  useUpdateDeliverable,
  type Deliverable,
} from '../hooks/use-deliverables';
import { LinkedRemarkButton } from '../../remarks/components/LinkedRemarkButton';
import { DeliverableDocument } from './DeliverableDocument';
import { DeliverableForm } from './DeliverableForm';
import { DeliverableVersionHistory } from './DeliverableVersionHistory';

export function DeliverableDetailView({
  thesisId,
  deliverableId,
  canEdit,
  canReview,
  backTo,
  objectivePath,
  trail,
}: {
  thesisId: string;
  deliverableId: string;
  canEdit: boolean;
  canReview?: boolean;
  backTo: string;
  objectivePath: (objectiveId: string) => string;
  trail?: { label: string; to: string }[];
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const deliverable = useDeliverable(thesisId, deliverableId);
  const objectives = useObjectives(canEdit ? thesisId : null, {});
  const update = useUpdateDeliverable(thesisId, deliverableId);
  const cancel = useCancelDeliverable(thesisId, deliverableId);
  const submit = useSubmitDeliverable(thesisId, deliverableId);
  const requestChanges = useRequestDeliverableChanges(thesisId, deliverableId);
  const approve = useApproveDeliverable(thesisId, deliverableId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  if (deliverable.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (deliverable.isError || !deliverable.data) return <QueryError error={deliverable.error} />;

  const data = deliverable.data;
  const editable = canEdit && (data.status === 'DRAFT' || data.status === 'CHANGES_REQUESTED');
  const canCancel = canEdit && data.status === 'DRAFT';
  const freshCorrection =
    !data.reviewedAt ||
    (data.versionsSummary.latestVersionCreatedAt != null &&
      data.versionsSummary.latestVersionCreatedAt > data.reviewedAt);
  const canSubmitAction =
    canEdit &&
    data.versionCount > 0 &&
    (data.status === 'DRAFT' || (data.status === 'CHANGES_REQUESTED' && freshCorrection));
  const crumbs = trail ?? [{ label: t('deliverables.title'), to: backTo }];
  const overdueHint =
    data.isOverdue && data.status === 'SUBMITTED'
      ? t('deliverables.overdueWhileSubmitted')
      : data.isOverdue && data.status === 'DRAFT'
        ? t('deliverables.overdueWhileDraft')
        : null;

  return (
    <article className="min-w-0">
      <nav className="mb-2 text-[11px] text-muted" aria-label={t('common.breadcrumb')}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.to}>
            {index > 0 ? <span aria-hidden="true"> / </span> : null}
            <Link to={crumb.to} className="text-brand hover:underline">
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden="true"> / </span>
        <span className="text-ink">{data.title}</span>
      </nav>

      <section className="overflow-hidden rounded-md border border-line bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-3 py-2.5">
          <div className="min-w-0">
            <h1 className="break-words text-base font-semibold tracking-tight text-ink">
              {data.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
              <span>{t(`deliverables.type.${data.type}`)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-ink">
                {t(`deliverables.status.${data.status}`)}
              </span>
              {data.isOverdue ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-danger">{t('common.overdue')}</span>
                </>
              ) : null}
              {data.versionCount > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {data.versionCount === 1
                      ? t('deliverables.versionCountOne')
                      : t('deliverables.versionCountMany', { count: data.versionCount })}
                  </span>
                </>
              ) : null}
            </p>
            {canReview ? null : (
              <p className="mt-1.5 max-w-2xl text-[11px] leading-snug text-muted">
                {t(`deliverables.statusHelp.${data.status}`)}
                {overdueHint ? ` ${overdueHint}` : ''}
              </p>
            )}
          </div>
          {editable || canCancel || canReview ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {canReview ? (
                <LinkedRemarkButton
                  thesisId={thesisId}
                  subject={data.title}
                  deliverableId={deliverableId}
                />
              ) : null}
              {editable ? (
                <IconAction
                  tone="neutral"
                  icon="pencil"
                  label={t('common.edit')}
                  onClick={() => setEditing(true)}
                />
              ) : null}
              {canCancel ? (
                <IconAction
                  tone="danger"
                  icon="close"
                  label={t('deliverables.cancel')}
                  onClick={() => setConfirming(true)}
                />
              ) : null}
            </div>
          ) : null}
        </header>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-b border-line px-3 py-2.5 text-xs sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {t('deliverables.metaObjective')}
            </dt>
            <dd className="mt-0.5 break-words text-ink">
              {data.objective ? (
                <Link to={objectivePath(data.objective.id)} className="text-brand hover:underline">
                  {data.objective.title}
                </Link>
              ) : (
                t('common.none')
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {t('deliverables.metaDue')}
            </dt>
            <dd
              className={`mt-0.5 tabular-nums ${data.isOverdue ? 'font-medium text-danger' : 'text-ink'}`}
            >
              {data.dueDate ? formatDay(data.dueDate, dateLocale) : t('common.notProvided')}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {t('deliverables.metaUpdated')}
            </dt>
            <dd className="mt-0.5 tabular-nums text-ink">
              {new Date(data.updatedAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
            </dd>
          </div>
        </dl>

        {data.description ? (
          <div className="border-b border-line px-3 py-2.5">
            <h2 className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {t('deliverables.description')}
            </h2>
            <p className="mt-0.5 break-words text-xs leading-relaxed text-ink">
              {data.description}
            </p>
          </div>
        ) : null}

        <ReviewPanel
          deliverable={data}
          canEdit={canEdit}
          canReview={Boolean(canReview)}
          canSubmit={canSubmitAction}
          reason={reason}
          onReason={setReason}
          submitPending={submit.isPending}
          approvePending={approve.isPending}
          changesPending={requestChanges.isPending}
          error={submit.error ?? approve.error ?? requestChanges.error}
          onSubmit={() => submit.mutate()}
          onApprove={() => approve.mutate()}
          onChanges={() => requestChanges.mutate(reason)}
        />
      </section>

      <DeliverableDocument thesisId={thesisId} deliverableId={deliverableId} />

      <DeliverableVersionHistory
        thesisId={thesisId}
        deliverableId={deliverableId}
        canCreate={editable}
      />

      <Modal
        open={editing}
        title={t('deliverables.edit')}
        closeLabel={t('common.close')}
        onClose={() => setEditing(false)}
      >
        <DeliverableForm
          objectives={objectives.data?.objectives ?? []}
          initial={data}
          pending={update.isPending}
          error={update.error}
          submitLabel={t('deliverables.form.save')}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await update.mutateAsync(body);
            setEditing(false);
          }}
        />
      </Modal>
      <Modal
        open={confirming}
        title={t('deliverables.cancel')}
        closeLabel={t('common.close')}
        onClose={() => setConfirming(false)}
      >
        <p className="text-sm text-ink">{t('deliverables.cancelConfirm')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={cancel.isPending}
            onClick={async () => {
              await cancel.mutateAsync();
              setConfirming(false);
            }}
          >
            {t('deliverables.confirmCancel')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            {t('common.back')}
          </Button>
        </div>
      </Modal>
    </article>
  );
}

function ReviewPanel({
  deliverable,
  canEdit,
  canReview,
  canSubmit,
  reason,
  onReason,
  submitPending,
  approvePending,
  changesPending,
  error,
  onSubmit,
  onApprove,
  onChanges,
}: {
  deliverable: Deliverable;
  canEdit: boolean;
  canReview: boolean;
  canSubmit: boolean;
  reason: string;
  onReason: (value: string) => void;
  submitPending: boolean;
  approvePending: boolean;
  changesPending: boolean;
  error: unknown;
  onSubmit: () => void;
  onApprove: () => void;
  onChanges: () => void;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const { status } = deliverable;
  if (status === 'CANCELLED') return null;

  const showDraft = status === 'DRAFT' && canEdit;
  const showSubmittedWaiting = status === 'SUBMITTED' && canEdit;
  const showReview = status === 'SUBMITTED' && canReview;
  const showSubmittedReadonly = status === 'SUBMITTED' && !canEdit && !canReview;
  const showChanges = status === 'CHANGES_REQUESTED';
  const showValidated = status === 'VALIDATED';
  if (
    !showDraft &&
    !showSubmittedWaiting &&
    !showReview &&
    !showSubmittedReadonly &&
    !showChanges &&
    !showValidated &&
    !error
  ) {
    return null;
  }

  return (
    <section className="bg-canvas/40 px-3 py-2.5" aria-label={t('deliverables.reviewAria')}>
      {showDraft ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">{t('deliverables.submitHint')}</p>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button
              className="h-8 px-3 text-xs"
              disabled={!canSubmit || submitPending}
              onClick={onSubmit}
            >
              {t('deliverables.submit')}
            </Button>
            {!canSubmit ? (
              <p className="text-[11px] text-muted">{t('deliverables.submitNeedVersion')}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSubmittedWaiting ? (
        <p className="text-xs font-medium text-ink">{t('deliverables.submittedWaiting')}</p>
      ) : null}

      {showReview ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-ink">{t('deliverables.submittedWaiting')}</p>
          <Textarea
            id="deliverable-review-message"
            label={t('deliverables.comment')}
            value={reason}
            maxLength={500}
            className="min-h-20 text-xs"
            onChange={(event) => onReason(event.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={changesPending}
              onClick={onChanges}
            >
              {t('deliverables.requestChanges')}
            </Button>
            <Button className="h-8 px-3 text-xs" disabled={approvePending} onClick={onApprove}>
              {t('deliverables.approve')}
            </Button>
          </div>
        </div>
      ) : null}

      {showSubmittedReadonly ? (
        <p className="text-xs text-ink">{t('deliverables.status.SUBMITTED')}</p>
      ) : null}

      {showChanges ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">{t('deliverables.changesRequested')}</p>
            {deliverable.reviewMessage ? (
              <p className="mt-1 text-xs text-ink">{deliverable.reviewMessage}</p>
            ) : null}
            {deliverable.reviewedBy ? (
              <p className="mt-1 text-[11px] text-muted">
                {t('deliverables.by', {
                  name: `${deliverable.reviewedBy.givenName} ${deliverable.reviewedBy.familyName}`,
                })}
              </p>
            ) : null}
            {canEdit ? (
              <p className="mt-1 text-[11px] text-muted">{t('deliverables.addCorrectedVersion')}</p>
            ) : null}
          </div>
          {canEdit ? (
            <Button
              className="h-8 shrink-0 px-3 text-xs"
              disabled={!canSubmit || submitPending}
              onClick={onSubmit}
            >
              {t('deliverables.resubmit')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {showValidated ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          <span className="font-medium text-ink">{t('deliverables.validated')}</span>
          {deliverable.reviewedBy ? (
            <span className="text-muted">
              {t('deliverables.validatedBy', {
                name: `${deliverable.reviewedBy.givenName} ${deliverable.reviewedBy.familyName}`,
              })}
            </span>
          ) : null}
          {deliverable.reviewedAt ? (
            <span className="tabular-nums text-muted">
              {t('deliverables.date', {
                date: new Date(deliverable.reviewedAt).toLocaleDateString(dateLocale, {
                  timeZone: 'UTC',
                }),
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
    </section>
  );
}
