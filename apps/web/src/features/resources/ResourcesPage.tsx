import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { QueryError } from '../objectives/components/QueryError';
import { useResources } from './hooks/use-resources';
import { ThesisDocuments } from './ThesisDocuments';

export function ResourcesPage() {
  const t = useT();
  const library = useResources();
  const canManage = library.data?.canShare ?? false;

  if (library.isLoading) {
    return (
      <div className="min-w-0" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-4 h-40" />
      </div>
    );
  }

  if (library.isError) {
    return (
      <div className="min-w-0">
        <QueryError error={library.error} />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('resources.title')}</h1>
      <ThesisDocuments canManage={canManage} />
    </div>
  );
}
