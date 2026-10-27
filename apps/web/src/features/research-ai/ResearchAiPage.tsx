import { Button, EmptyState, Skeleton } from '@thesispartner/ui';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import { useGenerateResearchAi, type ResearchAiSynthesis } from './hooks/use-research-ai';

export function ResearchAiPage() {
  const t = useT();
  const { locale } = useLocale();
  const dashboard = useDashboard();
  const thesisId = dashboard.data?.thesis?.id ?? null;
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

  const loading = dashboard.isLoading || (Boolean(thesisId) && !result && generate.isPending);
  const subscriptionRequired =
    generate.error instanceof ApiClientError &&
    generate.error.body.code === 'SUBSCRIPTION_REQUIRED';

  return (
    <div className="min-w-0">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t('researchAi.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">{t('researchAi.subtitle')}</p>
        </div>
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

      {dashboard.isError ? <QueryError error={dashboard.error} /> : null}
      {!thesisId && !dashboard.isLoading ? (
        <EmptyState title={t('researchAi.noThesis')} description={t('researchAi.subtitle')} />
      ) : null}
      {generate.isError && !loading ? (
        <div className="mb-4">
          <p className="text-sm text-danger" role="alert">
            {queryErrorMessage(generate.error, t)}
          </p>
          {subscriptionRequired ? (
            <p className="mt-3">
              <Link
                to="/abonnement"
                className="inline-flex rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"
              >
                {t('nav.billing')}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-40 md:col-span-2" />
        </div>
      ) : null}
      {result ? <SynthesisView data={result} /> : null}
    </div>
  );
}

const REPORT_CHAPTERS = ['PROBLEM', 'SUBJECT_SUMMARY', 'STATE_OF_ART'] as const;

function SynthesisView({ data }: { data: ResearchAiSynthesis }) {
  const t = useT();
  const chapters = REPORT_CHAPTERS.map((kind) => ({
    kind,
    chapter: data.sections.find((item) => item.kind === kind),
  })).filter((item) => item.chapter);

  if (chapters.length === 0) {
    return (
      <article className="rounded-[12px] border border-line bg-surface p-5">
        <div className="space-y-4 text-sm leading-7 text-ink">
          {data.overview
            .split(/\n\n+/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      </article>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        {t('researchAi.generatedAt', {
          date: new Date(data.generatedAt).toLocaleString(),
        })}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {chapters.map(({ kind, chapter }) => (
          <article
            key={chapter?.id ?? kind}
            className={`flex min-h-[12rem] min-w-0 flex-col rounded-[14px] border border-line bg-surface p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:p-5 ${
              kind === 'STATE_OF_ART' ? 'md:col-span-2' : ''
            }`}
          >
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              {t(`researchAi.kind.${kind}`)}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-ink">
              {(chapter?.summary ?? '')
                .split(/\n\n+/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
