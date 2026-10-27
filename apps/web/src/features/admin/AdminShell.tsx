import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ChartLine,
  ClipboardText,
  CreditCard,
  EnvelopeSimple,
  HardDrives,
  Receipt,
  SquaresFour,
  Users,
} from '@phosphor-icons/react';
import { Button, Modal } from '@thesispartner/ui';
import { BrandLogo } from '../../components/BrandLogo';
import { Icon } from '../../components/Icon';
import { useLogout, useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';

const ADMIN_NAV = [
  { to: '/admin', end: true, labelKey: 'admin.nav.dashboard' as const, Icon: SquaresFour },
  { to: '/admin/analytics', end: false, labelKey: 'admin.nav.analytics' as const, Icon: ChartLine },
  { to: '/admin/utilisateurs', end: false, labelKey: 'admin.nav.users' as const, Icon: Users },
  {
    to: '/admin/invitations',
    end: false,
    labelKey: 'admin.nav.invitations' as const,
    Icon: EnvelopeSimple,
  },
  { to: '/admin/audit', end: false, labelKey: 'admin.nav.audit' as const, Icon: ClipboardText },
  { to: '/admin/system', end: false, labelKey: 'admin.nav.system' as const, Icon: HardDrives },
  { to: '/admin/abonnements', end: false, labelKey: 'admin.nav.billing' as const, Icon: ClipboardText },
  { to: '/admin/plans', end: false, labelKey: 'admin.nav.plans' as const, Icon: ChartLine },
  { to: '/admin/paiements', end: false, labelKey: 'admin.nav.payments' as const, Icon: CreditCard },
  { to: '/admin/factures', end: false, labelKey: 'admin.nav.invoices' as const, Icon: Receipt },
];

export function AdminShell() {
  const t = useT();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const current = ADMIN_NAV.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <a href="#contenu-admin" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <div className="flex min-h-screen">
        <aside
          id="admin-sidebar"
          className="hidden w-60 shrink-0 border-r border-line bg-linear-to-b from-brand-soft/80 to-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start lg:overflow-hidden"
        >
          <AdminSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                className="px-2 lg:hidden"
                aria-label={t('common.openMenu')}
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="menu" />
              </Button>
              <Link to="/admin" aria-label={t('admin.title')} className="shrink-0 lg:hidden">
                <BrandLogo className="h-8 w-8" />
              </Link>
              <p className="truncate text-sm font-semibold tracking-tight">
                {current ? t(current.labelKey) : t('admin.title')}
              </p>
            </div>
            <AdminAccountActions compact />
          </header>
          <main id="contenu-admin" className="w-full min-w-0 flex-1 px-4 py-6 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
      <Modal
        open={menuOpen}
        title={t('admin.navLabel')}
        placement="start"
        closeLabel={t('common.close')}
        onClose={() => setMenuOpen(false)}
      >
        <AdminSidebar onNavigate={() => setMenuOpen(false)} />
      </Modal>
    </div>
  );
}

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pt-5 pb-4">
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2.5 px-1">
          <BrandLogo />
          <span className="block text-sm font-semibold leading-none tracking-tight text-ink">
            {t('admin.title')}
          </span>
        </Link>
      </div>
      <nav aria-label={t('admin.navLabel')} className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {ADMIN_NAV.map((item) => {
          const NavIcon = item.Icon;
          const label = t(item.labelKey);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={label}
              title={label}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-brand-soft font-semibold text-brand-strong'
                    : 'text-ink/80 hover:bg-brand-soft/50 hover:text-ink',
                ].join(' ')
              }
            >
              <NavIcon
                aria-hidden="true"
                size={20}
                weight="duotone"
                className="shrink-0"
              />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line p-2">
        <AdminAccountActions onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function AdminAccountActions({
  compact,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const t = useT();
  const me = useMeQuery();
  const logout = useLogout();

  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden truncate text-xs text-muted sm:inline">
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
    );
  }

  return (
    <>
      <p className="truncate px-2.5 py-1 text-xs text-muted">{me.data?.user.displayName}</p>
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-ink/80 hover:bg-ink/4 hover:text-ink"
      >
        <Icon name="back" className="shrink-0" />
        <span>{t('admin.backToApp')}</span>
      </Link>
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
        className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink/80 hover:bg-ink/4 hover:text-ink disabled:opacity-50"
      >
        <Icon name="signOut" className="shrink-0" />
        <span>{t('common.signOut')}</span>
      </button>
    </>
  );
}
