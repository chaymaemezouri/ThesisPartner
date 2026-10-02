import { EmptyState } from '@thesispartner/ui';
import { useT } from '../i18n/LocaleContext';

export function ModulePage({ title, description }: { title: string; description: string }) {
  const t = useT();
  return (
    <div>
      <header className="mb-8 max-w-2xl rounded-2xl bg-gradient-to-r from-brand-soft via-surface to-teal-soft px-4 py-4">
        <h1 className="font-serif text-2xl text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      </header>
      <EmptyState title={t('module.emptyTitle')} description={t('module.emptyDescription')} />
    </div>
  );
}
