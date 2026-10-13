import { Link } from 'react-router-dom';

import { useT } from '../../../i18n/LocaleContext';

import type { DashboardData } from '../labels';



export function PageHeader({ profile }: { profile: DashboardData['profile'] }) {

  const t = useT();

  const role = profile.specialty

    ? t('dashboard.doctoralIn', { specialty: profile.specialty })

    : profile.academicTitle;

  const facts = [role, profile.institution, profile.laboratory].filter((item): item is string =>

    Boolean(item),

  );

  const links = [

    profile.orcid ? { label: 'ORCID', href: `https://orcid.org/${profile.orcid}` } : null,

    profile.googleScholarUrl ? { label: 'Google Scholar', href: profile.googleScholarUrl } : null,

  ].filter((item): item is { label: string; href: string } => item !== null);



  return (

    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4">

      <ProfilePhoto name={profile.displayName} imageUrl={profile.avatarUrl} />

      <div className="min-w-0 flex-1">

        <h1 className="font-serif text-xl font-semibold text-ink">{profile.displayName}</h1>

        {facts.length > 0 ? <p className="mt-1 text-sm text-muted">{facts.join(' · ')}</p> : null}

      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">

        {links.map((item) => (

          <a key={item.label} href={item.href} className="text-brand">

            {item.label}

          </a>

        ))}

        <Link to="/profil" className="text-brand">

          {t('dashboard.editProfile')}

        </Link>

      </div>

    </header>

  );

}



function ProfilePhoto({ name, imageUrl }: { name: string; imageUrl: string | null }) {

  const frame = 'h-10 w-10 shrink-0 rounded-full border border-line object-cover';

  if (imageUrl && (imageUrl.startsWith('https://') || imageUrl.startsWith('http://'))) {

    return <img src={imageUrl} alt="" className={frame} />;

  }

  const initials = name

    .split(' ')

    .filter(Boolean)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase() ?? '')

    .join('');

  return (

    <span

      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-canvas text-xs font-medium text-ink"

      aria-hidden="true"

    >

      {initials || '·'}

    </span>

  );

}

