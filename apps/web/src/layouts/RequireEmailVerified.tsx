import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMeQuery } from '../hooks/use-session';

/** Unverified accounts may only verify, resend, or leave — not browse the workspace. */
const ALLOWED_PREFIXES = ['/confirmation-email', '/verifier-email'];

export function RequireEmailVerified() {
  const me = useMeQuery();
  const location = useLocation();

  if (me.isLoading || me.isError || !me.data?.user) {
    return <Outlet />;
  }

  if (me.data.user.emailVerified) {
    return <Outlet />;
  }

  if (ALLOWED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) {
    return <Outlet />;
  }

  const next = `${location.pathname}${location.search}`;
  return (
    <Navigate
      to={`/confirmation-email?next=${encodeURIComponent(next === '/' ? '/' : next)}`}
      replace
    />
  );
}
