import { Button, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
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
  useDeliverableVersions,
  useRequestDeliverableChanges,
  useSubmitDeliverable,
  useUpdateDeliverable,
  type Deliverable,
} from '../hooks/use-deliverables';
import { LinkedRemarkButton } from '../../remarks/components/LinkedRemarkButton';
import { documentPresentation } from '../presentation';
import { DeliverableDocument } from './DeliverableDocument';
import { DeliverableForm } from './DeliverableForm';
import { DeliverableStatusBadge } from './DeliverableStatusBadge';
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
  const versions = useDeliverableVersions(thesisId, deliverableId);
  const objectives = useObjectives(canEdit ? thesisId : null, {});
  const update = useUpdateDeliverable(thesisId, deliverableId);
  const cancel = useCancelDeliverable(thesisId, deliverableId);
  const submit = useSubmitDeliverable(thesisId, deliverableId);
  const requestChanges = useRequestDeliverableChanges(thesisId, deliverableId);
  const approve = useApproveDeliverable(thesisId, deliverableId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [addingVersion, setAddingVersion] = useState(false);

  if (deliverable.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (deliverable.isError || !deliverable.data) return <QueryError error={deliverable.error} />;

  const data = deliverable.data;
  const latest = [...(versions.data?.versions ?? [])].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  )[0];
  const hasCurrentFile = Boolean(latest?.file);
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
  const documentStyle = documentPresentation(data.type);
  const crumbs = trail ?? [{ label: t('deliverables.title'), to: backTo }];
  const overdueHint =
    data.isOverdue && data.status === 'SUBMITTED'
      ? t('deliverables.overdueWhileSubmitted')
      : data.isOverdue && data.status === 'DRAFT'
        ? t('deliverables.overdueWhileDraft')
        : null;

  return (
    <article className="min-w-0 rounded-md border border-line bg-surface p-4 sm:p-5">
      <nav
        className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted"
        aria-label={t('common.breadcrumb')}
      >
        {crumbs.map((crumb, index) => (
          <span key={crumb.to} className="inline-flex items-center gap-1.5">
            {index > 0 ? <Icon name="chevron" className="h-3 w-3" /> : null}
            <Link to={crumb.to} className="rounded text-muted transition-colors hover:text-brand">
              {crumb.label}
            </Link>
          </span>
        ))}
        <Icon name="chevron" className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate text-ink" aria-current="page">
          {data.title}
        </span>
      </nav>

      <section className="overflow-hidden rounded-[14px] border border-brand/15 bg-surface">
        <header
          className={`flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r ${documentStyle.wash} via-surface to-surface p-4 sm:p-5`}
        >
          <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${documentStyle.tone}`}
            >
              <Icon name={documentStyle.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] text-muted">{t(`deliverables.type.${data.type}`)}</p>
              <h1 className="break-words text-base font-semibold tracking-tight text-ink">
                {data.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <DeliverableStatusBadge status={data.status} />
                {data.versionCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/80 px-2 py-0.5">
                    <Icon name="library" className="h-3 w-3" />
                    {data.versionCount === 1
                      ? t('deliverables.versionCountOne')
                      : t('deliverables.versionCountMany', { count: data.versionCount })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {editable || canCancel || canReview ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                  showLabel
                  className="rounded-lg text-xs shadow-none"
                  label={t('common.edit')}
                  onClick={() => setEditing(true)}
                />
              ) : null}
              {canCancel ? (
                <IconAction
                  tone="danger"
                  icon="close"
                  showLabel
                  className="rounded-lg border-transparent bg-transparent text-xs shadow-none"
                  label={t('deliverables.cancel')}
                  onClick={() => setConfirming(true)}
                />
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <dl className="grid grid-cols-2 gap-2.5 text-xs lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="col-span-2 flex min-w-0 items-start gap-2.5 rounded-[10px] bg-brand-soft/45 p-3 lg:col-span-1">
              <Icon name="objectives" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted">
                  {t('deliverables.metaObjective')}
                </dt>
                <dd className="mt-1 break-words text-ink">
                  {data.objective ? (
                    <Link
                      to={objectivePath(data.objective.id)}
                      className="group inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      <span>{data.objective.title}</span>
                      <Icon
                        name="chevron"
                        className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  ) : (
                    t('common.none')
                  )}
                </dd>
              </div>
            </div>
            <div
              className={`flex min-w-0 items-start gap-2.5 rounded-[10px] p-3 ${data.isOverdue ? 'bg-danger-soft/60' : 'bg-canvas/75'}`}
            >
              <Icon
                name="meetings"
                className={`mt-0.5 h-4 w-4 shrink-0 ${data.isOverdue ? 'text-danger' : 'text-muted'}`}
              />
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted">{t('deliverables.metaDue')}</dt>
                <dd
                  className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums ${data.isOverdue ? 'font-medium text-danger' : 'text-ink'}`}
                >
                  <span>
                    {data.dueDate ? formatDay(data.dueDate, dateLocale) : t('common.notProvided')}
                  </span>
                  {data.isOverdue ? (
                    <span className="rounded-full bg-surface/80 px-1.5 py-0.5 text-[10px]">
                      {t('common.overdue')}
                    </span>
                  ) : null}
                </dd>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5 rounded-[10px] bg-canvas/75 p-3">
              <Icon name="watch" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0">
                <dt className="text-[10px] font-medium text-muted">
                  {t('deliverables.metaUpdated')}
                </dt>
                <dd className="mt-1 tabular-nums text-ink">
                  {new Date(data.updatedAt).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}
                </dd>
              </div>
            </div>
          </dl>
          {data.description ? (
            <p className="mt-3 break-words border-t border-line/70 pt-3 text-xs leading-relaxed text-muted">
              {data.description}
            </p>
          ) : null}
        </div>
      </section>

      <div
        className={
          hasCurrentFile
            ? 'mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]'
            : 'mt-4 space-y-4'
        }
      >
        <DeliverableDocument thesisId={thesisId} deliverableId={deliverableId} />
        <aside className="min-w-0 border-t border-line pt-4 lg:border-t-0 lg:pt-0">
          <div className="pb-3">
            <h2 className="text-sm font-semibold text-ink">{t('deliverables.nextStep')}</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {t(`deliverables.statusHelp.${data.status}`)}
              {overdueHint ? ` ${overdueHint}` : ''}
            </p>
            {editable ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-3 h-8 px-3 text-xs shadow-none"
                onClick={() => setAddingVersion(true)}
              >
                {t(data.versionCount > 0 ? 'deliverables.addVersion' : 'deliverables.firstVersion')}
              </Button>
            ) : null}
          </div>
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
        </aside>
      </div>
      <DeliverableVersionHistory
        thesisId={thesisId}
        deliverableId={deliverableId}
        canCreate={editable}
        open={addingVersion}
        onOpenChange={setAddingVersion}
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
    <section className="space-y-3" aria-label={t('deliverables.reviewAria')}>
      {showDraft ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">{t('deliverables.submitHint')}</p>
          <div className="flex flex-col items-start gap-1">
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
              disabled={changesPending || approvePending}
              onClick={onChanges}
            >
              {t('deliverables.requestChanges')}
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              disabled={approvePending || changesPending}
              onClick={onApprove}
            >
              {t('deliverables.approve')}
            </Button>
          </div>
        </div>
      ) : null}

      {showSubmittedReadonly ? (
        <p className="text-xs text-ink">{t('deliverables.status.SUBMITTED')}</p>
      ) : null}

      {showChanges ? (
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">{t('deliverables.lastFeedback')}</p>
            {deliverable.reviewMessage ? (
              <p className="mt-1 break-words whitespace-pre-wrap text-xs text-ink">
                {deliverable.reviewMessage}
              </p>
            ) : null}
            {deliverable.reviewedBy ? (
              <p className="mt-1 text-[11px] text-muted">
                {t('deliverables.by', {
                  name: `${deliverable.reviewedBy.givenName} ${deliverable.reviewedBy.familyName}`,
                })}
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <Button
              className="h-8 self-start px-3 text-xs"
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
