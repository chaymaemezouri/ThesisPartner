import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@thesispartner/ui';
import { ApiClientError } from '../api/client';
import { useMeQuery } from '../hooks/use-session';
import { useT } from '../i18n/LocaleContext';

export function RequireAuth() {
  const t = useT();
  const location = useLocation();
  const me = useMeQuery();

  if (me.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <p role="status" className="text-sm text-muted">
          {t('auth.openingSession')}
        </p>
      </main>
    );
  }

  if (me.isError) {
    const status = me.error instanceof ApiClientError ? me.error.body.statusCode : 0;
    if (status === 401) {
      return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
    }
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="max-w-md text-center" role="alert">
          <h1 className="font-serif text-2xl text-ink">{t('auth.serviceUnavailable')}</h1>
          <p className="mt-2 text-sm text-muted">{t('auth.serviceUnavailableHelp')}</p>
          <Button
            type="button"
            className="mt-4"
            disabled={me.isFetching}
            onClick={() => void me.refetch()}
          >
            {t('auth.retrySession')}
          </Button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
