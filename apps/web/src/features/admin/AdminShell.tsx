import { Link, NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from '../../components/BrandLogo';
import { useLogout, useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { Button } from '@thesispartner/ui';

const ADMIN_NAV = [
  { to: '/admin', end: true, labelKey: 'admin.nav.dashboard' as const },
  { to: '/admin/analytics', end: false, labelKey: 'admin.nav.analytics' as const },
  { to: '/admin/utilisateurs', end: false, labelKey: 'admin.nav.users' as const },
  { to: '/admin/invitations', end: false, labelKey: 'admin.nav.invitations' as const },
  { to: '/admin/audit', end: false, labelKey: 'admin.nav.audit' as const },
  { to: '/admin/system', end: false, labelKey: 'admin.nav.system' as const },
];

export function AdminShell() {
  const t = useT();
  const me = useMeQuery();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a href="#contenu-admin" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/admin"
              className="flex shrink-0 items-center gap-2"
              aria-label={t('admin.title')}
            >
              <BrandLogo className="h-8 w-8" />
              <span className="truncate text-sm font-semibold tracking-tight">
                {t('admin.title')}
              </span>
            </Link>
            <nav aria-label={t('admin.navLabel')} className="hidden items-center gap-1 sm:flex">
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-canvas font-medium text-ink' : 'text-muted hover:text-ink'}`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden truncate text-xs text-muted md:inline">
              {me.data?.user.displayName}
            </span>
            <Link to="/" className="rounded-md px-2 py-1 text-xs text-muted hover:text-ink">
              {t('admin.backToApp')}
            </Link>
            <Button
              type="button"
              variant="ghost"
              className="px-2 text-xs"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {t('common.signOut')}
            </Button>
          </div>
        </div>
        <nav
          aria-label={t('admin.navLabel')}
          className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 sm:hidden"
        >
          {ADMIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-canvas font-medium text-ink' : 'text-muted'}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="contenu-admin" className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
