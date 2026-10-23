import { Avatar } from '@thesispartner/ui';
import { Link, NavLink } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { useT } from '../../i18n/LocaleContext';
import { useThesisMembers } from '../objectives/hooks/use-objectives';
import { useSupervisedTheses } from './hooks/use-supervised-theses';
import { portraitUrl } from './temporary-portraits';
const SECTIONS = [
  { id: 'dashboard', to: '', icon: 'dashboard' },
  { id: 'objectives', to: '/objectifs', icon: 'objectives' },
  { id: 'deliverables', to: '/livrables', icon: 'deliverables' },
  { id: 'remarks', to: '/remarques', icon: 'remarks' },
  { id: 'meetings', to: '/reunions', icon: 'meetings' },
  { id: 'profile', to: '/profil', icon: 'profile' },
] as const;

export function StudentSpaceNav({ thesisId }: { thesisId: string }) {
  const t = useT();
  const root = `/encadrement/${thesisId}`;
  const thesis = useThesisMembers(thesisId);
  const roster = useSupervisedTheses();
  const student = thesis.data?.members.find((member) => member.role === 'DOCTORAL_STUDENT');
  const name = student?.displayName;
  const progress = roster.data?.theses.find(
    (item) => item.thesisId === thesisId,
  )?.progressPercentage;

  return (
    <div className="mb-4 min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex min-w-0 items-center gap-3 px-3 py-3">
        <Link
          to="/"
          aria-label={t('supervision.back')}
          title={t('supervision.back')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Icon name="back" className="h-4 w-4" />
        </Link>
        {name ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative inline-flex shrink-0">
              <Avatar
                label={name}
                imageUrl={portraitUrl(name, student?.avatarUrl)}
                size="sm"
                decorative
                className="!h-10 !w-10"
              />
              {progress != null ? (
                <span
                  className="absolute -right-0.5 -bottom-0.5 h-6 w-6 rounded-full shadow-control"
                  style={{
                    background: `conic-gradient(#295bb1 ${progress * 3.6}deg, #e7edf4 0deg)`,
                  }}
                  role="img"
                  aria-label={`${t('supervision.progressOf', { name })} ${progress}%`}
                >
                  <span className="absolute inset-[2.5px] grid place-items-center rounded-full bg-surface text-[7px] font-semibold leading-none text-ink tabular-nums">
                    {progress}%
                  </span>
                </span>
              ) : null}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{name}</span>
          </div>
        ) : null}
      </div>
      <nav
        aria-label={t('supervision.title')}
        className="flex min-w-0 gap-1 overflow-x-auto border-t border-line p-1.5 [scrollbar-width:thin]"
      >
        {SECTIONS.map((section) => (
          <NavLink
            key={section.id}
            to={`${root}${section.to}`}
            end={section.to === ''}
            className={({ isActive }) =>
              isActive
                ? 'inline-flex shrink-0 items-center gap-2 rounded-full bg-ink/6 px-3 py-2 text-sm font-semibold text-ink'
                : 'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink'
            }
          >
            <Icon name={section.icon} className="h-3.5 w-3.5" />
            {t(`supervision.section.${section.id}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
