import { Link } from 'react-router-dom';
import { Avatar } from '@thesispartner/ui';
import { useT } from '../../../i18n/LocaleContext';
import type { DashboardData } from '../labels';

export function AcademicProfileHeader({ profile }: { profile: DashboardData['profile'] }) {
  const t = useT();
  const specialty = profile.specialty ?? profile.academicTitle;
  const links = [
    profile.orcid ? { label: 'ORCID', href: `https://orcid.org/${profile.orcid}` } : null,
    profile.googleScholarUrl ? { label: 'Google Scholar', href: profile.googleScholarUrl } : null,
    profile.linkedinUrl ? { label: 'LinkedIn', href: profile.linkedinUrl } : null,
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-stretch sm:gap-4">
        <Link to="/profil" className="shrink-0 self-start">
          <Avatar label={profile.displayName} imageUrl={profile.avatarUrl} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <Link to="/profil" className="block min-w-0">
                <h2 className="truncate font-serif text-lg text-ink sm:text-xl">
                  {profile.displayName}
                </h2>
              </Link>
              {specialty ? (
                <p className="mt-0.5 truncate text-sm text-muted">{specialty}</p>
              ) : null}
            </div>
            <Link
              to="/profil"
              className="shrink-0 text-xs font-medium tracking-wide text-muted uppercase transition-colors hover:text-ink"
            >
              {t('dashboard.editMyProfile')}
            </Link>
          </div>

          <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {t('dashboard.university')}
              </dt>
              <dd className="mt-0.5 line-clamp-2 text-ink">
                {profile.institution ?? t('common.notProvided')}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {t('dashboard.laboratory')}
              </dt>
              <dd className="mt-0.5 line-clamp-2 text-ink">
                {profile.laboratory ?? t('common.notProvided')}
              </dd>
            </div>
          </dl>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
            {links.length > 0 ? (
              links.map((item, index) => (
                <span key={item.label} className="inline-flex items-center gap-x-2">
                  {index > 0 ? (
                    <span className="text-muted" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <a
                    href={item.href}
                    className="font-medium text-brand hover:underline"
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                </span>
              ))
            ) : (
              <p className="text-muted">{t('dashboard.linksUnset')}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
