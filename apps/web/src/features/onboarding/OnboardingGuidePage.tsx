import { OnboardingPanel } from './OnboardingPanel';
import { useT } from '../../i18n/LocaleContext';

export function OnboardingGuidePage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{t('onboarding.guidePageTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('onboarding.guidePageSubtitle')}</p>
      </header>
      <OnboardingPanel forceOpen />
    </div>
  );
}
