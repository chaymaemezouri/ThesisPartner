import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiClientError } from '../api/client';
import { useMeQuery } from '../hooks/use-session';

export function RequireAuth() {
  const location = useLocation();
  const me = useMeQuery();

  if (me.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <p className="text-sm text-muted">Ouverture de la session…</p>
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
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl text-ink">Service indisponible</h1>
          <p className="mt-2 text-sm text-muted">
            L’espace de travail ne répond pas. Réessayez dans un moment.
          </p>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
