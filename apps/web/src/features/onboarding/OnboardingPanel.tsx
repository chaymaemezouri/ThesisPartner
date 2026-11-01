import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal } from '@thesispartner/ui';
import type { z } from 'zod';
import type { onboardingStatusSchema } from '@thesispartner/validation';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { useOnboardingAction, useOnboardingStatus } from './hooks/use-onboarding';

type Status = z.infer<typeof onboardingStatusSchema>;
type Step = Status['steps'][number];

export function OnboardingPanel({ forceOpen = false }: { forceOpen?: boolean }) {
  const t = useT();
  const me = useMeQuery();
  const onboarding = useOnboardingStatus(Boolean(me.data?.user.emailVerified));
  const action = useOnboardingAction();
  const [openGuide, setOpenGuide] = useState(forceOpen);
  const [tourIndex, setTourIndex] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpenGuide(true);
      void action.mutateAsync('reopen_guide');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reopen once when forceOpen mounts
  }, [forceOpen]);

  if (!me.data?.user.emailVerified || onboarding.isLoading || !onboarding.data) return null;

  const data = onboarding.data;
  const showWelcome = !data.welcomeDismissed && !forceOpen;
  const incomplete = data.steps.some((step) => step.status !== 'done');
  const inviteStep = data.steps.find((step) => step.id === 'invite');
  const doneCount = data.steps.filter((step) => step.status === 'done').length;
  const progress = data.steps.length ? Math.round((doneCount / data.steps.length) * 100) : 0;
  const tourSteps = data.steps.filter((step) => step.status !== 'done' || forceOpen);
  const activeTour = tourSteps[Math.min(tourIndex, Math.max(tourSteps.length - 1, 0))];

  return (
    <>
      {inviteStep && inviteStep.status !== 'done' && data.persona !== 'SUPERVISOR' ? (
        <div
          className="rounded-xl border border-brand/25 bg-brand-soft/40 px-4 py-3 text-sm text-ink"
          role="status"
        >
          <p>
            {inviteStep.status === 'pending'
              ? t('onboarding.inviteBannerPending')
              : t('onboarding.inviteBannerTodo')}
          </p>
          {inviteStep.href && inviteStep.status === 'todo' ? (
            <Link
              to={inviteStep.href}
              className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline"
            >
              {t('onboarding.inviteCta')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {data.persona === 'SUPERVISOR' &&
      !data.steps.some((step) => step.id === 'supervisor_students' && step.status === 'done') ? (
        <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm" role="status">
          <p className="font-medium text-ink">{t('onboarding.emptySupervisorTitle')}</p>
          <p className="mt-1 text-muted">{t('onboarding.emptySupervisorBody')}</p>
          <Link
            to="/invitations"
            className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline"
          >
            {t('onboarding.go')}
          </Link>
        </div>
      ) : null}

      {incomplete || forceOpen ? (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">{t('onboarding.checklistTitle')}</h2>
              <p className="mt-1 text-sm text-muted">{t('onboarding.checklistSubtitle')}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={() => {
                setTourIndex(0);
                setOpenGuide(true);
              }}
            >
              {t('onboarding.openGuide')}
            </Button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted">
            {doneCount}/{data.steps.length}
          </p>
          <ol className="mt-4 space-y-2">
            {data.steps.map((step) => (
              <li
                key={step.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {t(stepTitleKey(step.id))}
                  </p>
                  <p className="text-xs text-muted">{t(stepHelpKey(step.id))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={step.status} />
                  {step.href && step.status !== 'done' && step.status !== 'blocked' ? (
                    <Link
                      to={step.href}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      {t('onboarding.go')}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <Modal
        open={showWelcome || openGuide}
        title={welcomeTitle(data, t)}
        closeLabel={t('common.close')}
        onClose={() => {
          setOpenGuide(false);
          if (!data.welcomeDismissed) {
            void action.mutateAsync('dismiss_welcome');
          }
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">{welcomeBody(data, t)}</p>
          {activeTour ? (
            <div className="rounded-xl border border-line bg-canvas/70 px-3 py-3">
              <p className="text-sm font-medium text-ink">{t(stepTitleKey(activeTour.id))}</p>
              <p className="mt-1 text-xs text-muted">{t(stepHelpKey(activeTour.id))}</p>
              {activeTour.href ? (
                <Link
                  to={activeTour.href}
                  className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline"
                  onClick={() => setOpenGuide(false)}
                >
                  {t('onboarding.go')}
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-ink">
              {data.steps.slice(0, 4).map((step) => (
                <li key={step.id} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                  <span>{t(stepTitleKey(step.id))}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {tourSteps.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={tourIndex <= 0}
                  onClick={() => setTourIndex((index) => Math.max(0, index - 1))}
                >
                  {t('onboarding.previous')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={tourIndex >= tourSteps.length - 1}
                  onClick={() => setTourIndex((index) => Math.min(tourSteps.length - 1, index + 1))}
                >
                  {t('onboarding.next')}
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              onClick={() => {
                setOpenGuide(false);
                void action.mutateAsync(
                  data.guideCompleted && !forceOpen ? 'dismiss_welcome' : 'complete_guide',
                );
              }}
            >
              {t('onboarding.finish')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpenGuide(false);
                void action.mutateAsync('dismiss_welcome');
              }}
            >
              {t('onboarding.skip')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function stepTitleKey(id: string): MessageKey {
  return `onboarding.steps.${id}.title` as MessageKey;
}

function stepHelpKey(id: string): MessageKey {
  return `onboarding.steps.${id}.help` as MessageKey;
}

function StatusPill({ status }: { status: Step['status'] }) {
  const t = useT();
  const tone =
    status === 'done'
      ? 'bg-ok-soft text-ok'
      : status === 'pending'
        ? 'bg-warn-soft text-warn'
        : status === 'blocked'
          ? 'bg-canvas text-muted'
          : 'bg-brand-soft text-brand';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {t(`onboarding.status.${status}`)}
    </span>
  );
}

function welcomeTitle(data: Status, t: ReturnType<typeof useT>): string {
  if (data.persona === 'SUPERVISOR') return t('onboarding.welcomeSupervisorTitle');
  if (data.persona === 'BOTH') return t('onboarding.welcomeBothTitle');
  return t('onboarding.welcomeDoctoralTitle');
}

function welcomeBody(data: Status, t: ReturnType<typeof useT>): string {
  if (data.persona === 'SUPERVISOR') return t('onboarding.welcomeSupervisorBody');
  if (data.persona === 'BOTH') return t('onboarding.welcomeBothBody');
  return t('onboarding.welcomeDoctoralBody');
}
