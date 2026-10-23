import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar, Button, Dropdown, Modal } from '@thesispartner/ui';
import { Icon } from '../components/Icon';
import { BrandLogo } from '../components/BrandLogo';
import { StudentNotificationsBell } from '../features/resources/StudentNotificationsBell';
import { useLogout, useMeQuery } from '../hooks/use-session';
import { useSupervisedTheses } from '../features/supervision/hooks/use-supervised-theses';
import { portraitUrl } from '../features/supervision/temporary-portraits';
import { useT } from '../i18n/LocaleContext';
import {
  navItemForPath,
  PRIMARY_NAV,
  SECONDARY_NAV,
  SUPERVISOR_NAV,
  navigationGroups,
  type NavItem,
} from '../routes/nav';

type SidebarPreference = { density: 'auto' | 'expanded' | 'collapsed'; hidden: boolean };
const SIDEBAR_PREFERENCE_KEY = 'tp_sidebar';

function readSidebarPreference(): SidebarPreference {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SIDEBAR_PREFERENCE_KEY) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'density' in value &&
      'hidden' in value &&
      (value.density === 'auto' || value.density === 'expanded' || value.density === 'collapsed') &&
      typeof value.hidden === 'boolean'
    ) {
      return { density: value.density, hidden: value.hidden };
    }
  } catch {
    /* Use the responsive layout if browser storage is unavailable. */
  }
  return { density: 'auto', hidden: false };
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebar, setSidebar] = useState(readSidebarPreference);
  const location = useLocation();
  const t = useT();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PREFERENCE_KEY, JSON.stringify(sidebar));
    } catch {
      /* Keep the choice for this session when storage is unavailable. */
    }
  }, [sidebar]);

  const toggleSidebarSize = () => {
    setSidebar((current) => {
      const expanded =
        current.density === 'expanded' ||
        (current.density === 'auto' && window.matchMedia('(min-width: 1280px)').matches);
      return { density: expanded ? 'collapsed' : 'expanded', hidden: false };
    });
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const dashboard = location.pathname === '/';
  const chat = location.pathname === '/messagerie' || location.pathname.startsWith('/messagerie/');

  return (
    <div
      className={
        chat
          ? 'h-dvh min-h-0 overflow-hidden bg-canvas text-ink'
          : dashboard
            ? 'min-h-screen overflow-x-clip bg-canvas text-ink lg:h-dvh lg:overflow-hidden'
            : 'min-h-screen overflow-x-clip bg-canvas text-ink'
      }
    >
      <a href="#contenu" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <div
        className={
          chat
            ? 'flex h-full min-h-0'
            : dashboard
              ? 'flex min-h-screen lg:h-full lg:min-h-0'
              : 'flex min-h-screen'
        }
      >
        <aside
          id="desktop-sidebar"
          className={`hidden shrink-0 border-r border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:flex-col lg:self-start lg:overflow-hidden ${sidebar.hidden ? '' : 'lg:flex'} ${sidebar.density === 'expanded' ? 'lg:w-60' : sidebar.density === 'collapsed' ? 'lg:w-[4.5rem]' : 'lg:w-[4.5rem] xl:w-60'}`}
        >
          <Sidebar
            variant={
              sidebar.density === 'expanded'
                ? 'full'
                : sidebar.density === 'collapsed'
                  ? 'compact'
                  : 'responsive'
            }
            onResize={toggleSidebarSize}
          />
        </aside>
        <div
          className={
            dashboard || chat
              ? 'flex min-h-0 min-w-0 flex-1 flex-col'
              : 'flex min-w-0 flex-1 flex-col'
          }
        >
          <Topbar
            onOpenMenu={() => setMenuOpen(true)}
            sidebarHidden={sidebar.hidden}
            onToggleSidebar={() =>
              setSidebar((current) => ({ ...current, hidden: !current.hidden }))
            }
          />
          <main
            id="contenu"
            className={
              location.pathname === '/'
                ? 'flex min-h-0 w-full flex-1 flex-col px-4 py-2 lg:overflow-hidden lg:px-5 lg:py-1.5'
                : chat
                  ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden'
                  : 'w-full min-w-0 flex-1 px-4 py-3 md:px-6 lg:py-3'
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

function Topbar({
  onOpenMenu,
  sidebarHidden,
  onToggleSidebar,
}: {
  onOpenMenu: () => void;
  sidebarHidden: boolean;
  onToggleSidebar: () => void;
}) {
  const location = useLocation();
  const me = useMeQuery();
  const logout = useLogout();
  const supervised = useSupervisedTheses();
  const t = useT();
  const [desktopNav, setDesktopNav] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktopNav(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const navigation =
    (supervised.data?.theses.length ?? 0) > 0
      ? [...SUPERVISOR_NAV, ...SECONDARY_NAV]
      : [...PRIMARY_NAV, ...SECONDARY_NAV];
  const current = navItemForPath(location.pathname, navigation);
  const accountLabel = me.data?.user.displayName ?? t('common.account');
  const currentLabel = current ? t(current.labelKey) : t('common.appName');
  const isSupervisor = (supervised.data?.theses.length ?? 0) > 0;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {desktopNav ? (
          <Button
            variant="ghost"
            className="px-2"
            aria-label={t(sidebarHidden ? 'common.showMenu' : 'common.hideMenu')}
            title={t(sidebarHidden ? 'common.showMenu' : 'common.hideMenu')}
            aria-controls="desktop-sidebar"
            aria-expanded={!sidebarHidden}
            onClick={onToggleSidebar}
          >
            <Icon name="menu" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="px-2"
            aria-label={t('common.openMenu')}
            onClick={onOpenMenu}
          >
            <Icon name="menu" />
          </Button>
        )}
        <Link
          to="/"
          aria-label={t('common.appName')}
          className={sidebarHidden || !desktopNav ? 'shrink-0' : 'hidden'}
        >
          <BrandLogo className="h-8 w-8" />
        </Link>
        <p className="truncate text-sm font-semibold tracking-tight">{currentLabel}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isSupervisor ? <StudentNotificationsBell /> : null}
        <Link
          to="/messagerie"
          aria-label={t('nav.messages')}
          title={t('nav.messages')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-canvas"
        >
          <Icon name="messages" />
        </Link>
        <Dropdown
          menuLabel={t('common.account')}
          label={
            <>
              <Avatar
                label={accountLabel}
                imageUrl={portraitUrl(accountLabel, me.data?.user.avatarUrl)}
                decorative
              />
              <span className="sr-only max-w-40 truncate sm:not-sr-only">{accountLabel}</span>
            </>
          }
        >
          {(close) => (
            <>
              <AccountLink to="/profil" icon="profile" onSelect={close}>
                {t('common.profile')}
              </AccountLink>
              <AccountLink to="/parametres" icon="settings" onSelect={close}>
                {t('common.settings')}
              </AccountLink>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-canvas"
                onClick={() => {
                  close();
                  logout.mutate();
                }}
              >
                <Icon name="signOut" className="h-4 w-4 shrink-0 text-muted" />
                {t('common.signOut')}
              </button>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}

function AccountLink({
  to,
  icon,
  onSelect,
  children,
}: {
  to: string;
  icon: 'profile' | 'settings';
  onSelect: () => void;
  children: string;
}) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas"
    >
      <Icon name={icon} className="h-4 w-4 shrink-0 text-muted" />
      {children}
    </Link>
  );
}

function Sidebar({
  variant,
  onNavigate,
  onResize,
}: {
  variant: 'responsive' | 'full' | 'compact';
  onNavigate?: () => void;
  onResize?: () => void;
}) {
  const labelClass =
    variant === 'compact'
      ? 'sr-only'
      : variant === 'responsive'
        ? 'sr-only xl:not-sr-only'
        : undefined;
  const supervised = useSupervisedTheses();
  const t = useT();
  const primary = (supervised.data?.theses.length ?? 0) > 0 ? SUPERVISOR_NAV : PRIMARY_NAV;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-5 pb-4">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
          <BrandLogo />
          <span className={labelClass}>
            <span className="block text-sm font-semibold leading-none tracking-tight text-ink">
              {t('common.appName')}
            </span>
          </span>
        </Link>
      </div>
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navigationGroups(primary).map((group) => (
          <div key={group.labelKey ?? 'home'} className="mb-3 flex flex-col gap-1">
            {group.labelKey ? (
              <p className={`${labelClass ?? ''} px-2.5 pb-1 pt-2 text-xs font-medium text-muted`}>
                {t(group.labelKey)}
              </p>
            ) : null}
            {group.items.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                labelClass={labelClass}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-2">
          {SECONDARY_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              labelClass={labelClass}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
      {onResize ? (
        <button
          type="button"
          aria-label={t('common.resizeMenu')}
          title={t('common.resizeMenu')}
          onClick={onResize}
          className="mx-2 mb-2 inline-flex min-h-9 shrink-0 items-center gap-3 rounded-lg border border-line px-2.5 py-2 text-xs text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <Icon
            name="chevron"
            className={`h-4 w-4 shrink-0 ${variant === 'full' ? 'rotate-180' : variant === 'responsive' ? 'xl:rotate-180' : ''}`}
          />
          <span className={labelClass}>{t('common.compactMenu')}</span>
        </button>
      ) : null}
    </div>
  );
}

function SidebarLink({
  item,
  labelClass,
  onNavigate,
}: {
  item: NavItem;
  labelClass?: string;
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
          'relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-ink/6 font-semibold text-ink'
            : 'text-ink/80 hover:bg-ink/4 hover:text-ink',
        ].join(' ')
      }
    >
      <Icon name={item.icon} className="shrink-0" />
      <span className={labelClass}>{label}</span>
    </NavLink>
  );
}
