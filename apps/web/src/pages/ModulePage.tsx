import { EmptyState } from '@thesispartner/ui';
import { useT } from '../i18n/LocaleContext';

export function ModulePage({ title }: { title: string }) {
  const t = useT();
  return (
    <div>
      <h1 className="sr-only">{title}</h1>
      <EmptyState title={t('module.emptyTitle')} description={t('module.emptyDescription')} />
    </div>
  );
}
