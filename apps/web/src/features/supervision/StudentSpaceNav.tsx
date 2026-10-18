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
    <div className="mb-4 flex items-center gap-2">
      <Link
        to="/"
        aria-label={t('supervision.back')}
        title={t('supervision.back')}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-brand shadow-control hover:bg-brand-soft"
      >
        <Icon name="back" className="h-4 w-4" />
      </Link>
      {name ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="relative inline-flex">
            <Avatar
              label={name}
              imageUrl={portraitUrl(name, student?.avatarUrl)}
              size="sm"
              decorative
              className="!h-14 !w-14"
            />
            {progress != null ? (
              <span
                className="absolute -right-0.5 -bottom-0.5 h-6 w-6 rounded-full shadow-control"
                style={{
                  background: `conic-gradient(#e9a23b ${progress * 3.6}deg, #e7edf4 0deg)`,
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
          <span className="max-w-36 truncate text-sm font-semibold text-ink sm:max-w-44">
            {name}
          </span>
        </div>
      ) : null}
      <nav
        aria-label={t('supervision.title')}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((section) => (
          <NavLink
            key={section.id}
            to={`${root}${section.to}`}
            end={section.to === ''}
            className={({ isActive }) =>
              isActive
                ? 'inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-soft py-1 pr-3 pl-1 text-sm font-semibold text-brand'
                : 'inline-flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium text-ink hover:bg-canvas'
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={
                    isActive
                      ? 'grid h-6 w-6 place-items-center rounded-full bg-surface text-brand shadow-control'
                      : 'grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand'
                  }
                >
                  <Icon name={section.icon} className="h-3.5 w-3.5" />
                </span>
                {t(`supervision.section.${section.id}`)}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
