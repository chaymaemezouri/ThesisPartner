import { Button, Skeleton } from '@thesispartner/ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import { StudentSpaceNav } from '../supervision/StudentSpaceNav';
import { useGenerateResearchAi, type ResearchAiSynthesis } from './hooks/use-research-ai';

export function ResearchAiPage({ mode = 'student' }: { mode?: 'student' | 'supervisor' }) {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams();
  const dashboard = useDashboard();
  const thesisId =
    mode === 'supervisor' ? (params.thesisId ?? null) : (dashboard.data?.thesis?.id ?? null);
  const generate = useGenerateResearchAi(thesisId, locale === 'fr' ? 'fr' : 'en');
  const [result, setResult] = useState<ResearchAiSynthesis | null>(null);

  useEffect(() => {
    setResult(null);
    if (!thesisId) return;
    let cancelled = false;
    void generate
      .mutateAsync()
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Load once per thesis; regenerate via the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thesisId, locale]);

  const loading =
    (mode === 'student' && dashboard.isLoading) ||
    (Boolean(thesisId) && !result && generate.isPending);

  return (
    <div className="min-w-0">
      {mode === 'supervisor' && thesisId ? <StudentSpaceNav thesisId={thesisId} /> : null}
      <h1 className="sr-only">{t('researchAi.title')}</h1>
      <header className="mb-3 flex justify-end">
        <Button
          className="h-9 px-3 text-sm"
          disabled={!thesisId || generate.isPending}
          onClick={() => {
            void generate
              .mutateAsync()
              .then(setResult)
              .catch(() => undefined);
          }}
        >
          <Icon name="radar" className="h-4 w-4" />
          {generate.isPending ? t('researchAi.generating') : t('researchAi.generate')}
        </Button>
      </header>

      {mode === 'student' && dashboard.isError ? <QueryError error={dashboard.error} /> : null}
      {!thesisId && !dashboard.isLoading ? (
        <p className="text-sm text-muted">{t('researchAi.noThesis')}</p>
      ) : null}
      {generate.isError ? (
        <p className="mb-3 text-sm text-danger">{queryErrorMessage(generate.error, t)}</p>
      ) : null}
      {loading ? (
        <div className="grid gap-3" aria-busy="true">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : null}
      {result ? <SynthesisView data={result} /> : null}
    </div>
  );
}

function SynthesisView({ data }: { data: ResearchAiSynthesis }) {
  const t = useT();
  return (
    <article className="mx-auto max-w-3xl rounded-[12px] border border-line bg-surface px-5 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-8 sm:py-9">
      <header className="mb-8 border-b border-line pb-5 text-center">
        <h2 className="font-serif text-[1.45rem] font-semibold leading-snug tracking-tight text-ink sm:text-[1.7rem]">
          {data.reportTitle}
        </h2>
        <p className="mt-3 text-xs text-muted">
          {t('researchAi.generatedAt', {
            date: new Date(data.generatedAt).toLocaleString(),
          })}
        </p>
      </header>
      <div className="space-y-5 text-[15.5px] leading-8 text-ink">
        {data.overview
          .split(/\n\n+/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, index) => (
            <p key={index} className="text-justify">
              {paragraph}
            </p>
          ))}
      </div>
    </article>
  );
}

export function SupervisorResearchAiPage() {
  return <ResearchAiPage mode="supervisor" />;
}
