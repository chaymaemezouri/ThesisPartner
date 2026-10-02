import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar, Button, Dropdown, Modal } from '@thesispartner/ui';
import { Icon } from '../components/Icon';
import { useLogout, useMeQuery } from '../hooks/use-session';
import { useSupervisedTheses } from '../features/supervision/hooks/use-supervised-theses';
import { useT } from '../i18n/LocaleContext';
import {
  navItemForPath,
  PRIMARY_NAV,
  SECONDARY_NAV,
  SUPERVISOR_NAV,
  type NavItem,
} from '../routes/nav';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const t = useT();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const dashboard = location.pathname === '/';

  return (
    <div
      className={
        dashboard
          ? 'min-h-screen overflow-x-clip bg-canvas text-ink lg:h-dvh lg:overflow-hidden'
          : 'min-h-screen overflow-x-clip bg-canvas text-ink'
      }
    >
      <a href="#contenu" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <div className={dashboard ? 'flex min-h-screen lg:h-full lg:min-h-0' : 'flex min-h-screen'}>
        <aside className="hidden shrink-0 border-r border-line bg-surface lg:flex lg:w-[4.5rem] lg:flex-col xl:w-60">
          <Sidebar variant="responsive" />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setMenuOpen(true)} />
          <main
            id="contenu"
            className={
              location.pathname === '/'
                ? 'flex min-h-0 w-full flex-1 flex-col px-4 py-2 lg:overflow-hidden lg:px-5 lg:py-1.5'
                : 'w-full flex-1 px-4 py-4 md:px-5'
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
      <Modal
        open={menuOpen}
        title={t('common.menu')}
        placement="start"
        closeLabel={t('common.close')}
        onClose={() => setMenuOpen(false)}
      >
        <Sidebar variant="full" onNavigate={() => setMenuOpen(false)} />
      </Modal>
    </div>
  );
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation();
  const me = useMeQuery();
  const logout = useLogout();
  const supervised = useSupervisedTheses();
  const t = useT();
  const navigation =
    (supervised.data?.theses.length ?? 0) > 0
      ? [...SUPERVISOR_NAV, ...SECONDARY_NAV]
      : [...PRIMARY_NAV, ...SECONDARY_NAV];
  const current = navItemForPath(location.pathname, navigation);
  const accountLabel = me.data?.user.displayName ?? t('common.account');
  const currentLabel = current ? t(current.labelKey) : t('common.appName');

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          className="px-2 lg:hidden"
          aria-label={t('common.openMenu')}
          onClick={onOpenMenu}
        >
          <Icon name="menu" />
        </Button>
        <p className="truncate text-sm font-medium">{currentLabel}</p>
      </div>
      <Dropdown
        menuLabel={t('common.account')}
        label={
          <>
            <Avatar label={accountLabel} decorative />
            <span className="sr-only max-w-40 truncate sm:not-sr-only">{accountLabel}</span>
          </>
        }
      >
        {(close) => (
          <>
            <AccountLink to="/profil" onSelect={close}>
              {t('common.profile')}
            </AccountLink>
            <AccountLink to="/parametres" onSelect={close}>
              {t('common.settings')}
            </AccountLink>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
              onClick={() => {
                close();
                logout.mutate();
              }}
            >
              {t('common.signOut')}
            </button>
          </>
        )}
      </Dropdown>
    </header>
  );
}

function AccountLink({
  to,
  onSelect,
  children,
}: {
  to: string;
  onSelect: () => void;
  children: string;
}) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onSelect}
      className="block px-3 py-2 text-sm text-ink hover:bg-canvas"
    >
      {children}
    </Link>
  );
}

function Sidebar({
  variant,
  onNavigate,
}: {
  variant: 'responsive' | 'full';
  onNavigate?: () => void;
}) {
  const compact = variant === 'responsive';
  const supervised = useSupervisedTheses();
  const t = useT();
  const primary = (supervised.data?.theses.length ?? 0) > 0 ? SUPERVISOR_NAV : PRIMARY_NAV;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-3 py-4">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-white">
            <Icon name="thesis" className="h-4 w-4" />
          </span>
          <span className={compact ? 'sr-only xl:not-sr-only' : undefined}>
            <span className="block text-sm font-semibold leading-none tracking-tight text-ink">
              {t('common.appName')}
            </span>
          </span>
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {primary.map((item) => (
            <SidebarLink key={item.to} item={item} compact={compact} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-2">
          {SECONDARY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} compact={compact} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({
  item,
  compact,
  onNavigate,
}: {
  item: NavItem;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const label = t(item.labelKey);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={label}
      title={label}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-brand-soft font-medium text-brand' : 'text-ink hover:bg-canvas',
        ].join(' ')
      }
    >
      <Icon name={item.icon} />
      <span className={compact ? 'sr-only xl:not-sr-only' : undefined}>{label}</span>
    </NavLink>
  );
}
