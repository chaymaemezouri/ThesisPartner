import { Navigate, Outlet } from 'react-router-dom';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';

export function RequireSuperAdmin() {
  const t = useT();
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

  if (!me.data || me.data.user.platformRole !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
