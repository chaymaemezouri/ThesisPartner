import { useParams } from 'react-router-dom';
import { Skeleton } from '@thesispartner/ui';
import { useT } from '../../i18n/LocaleContext';
import { AcademicProfileHeader } from '../dashboard/components/AcademicProfileHeader';
import { formatShortDay } from '../dashboard/labels';
import { QueryError } from '../objectives/components/QueryError';
import { useStudentSpace } from './hooks/use-supervised-theses';
import { StudentSpaceNav } from './StudentSpaceNav';

export function StudentProfilePage() {
  const t = useT();
  const params = useParams();
  const thesisId = params.thesisId ?? '';
  const space = useStudentSpace(thesisId);

  if (space.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (space.isError || !space.data) return <QueryError error={space.error} />;

  const data = space.data;
  const profile = data.profile;
  const thesis = data.thesis;

  return (
    <div className="min-w-0">
      <StudentSpaceNav thesisId={thesisId} />
      <h1 className="sr-only">{t('supervision.section.profile')}</h1>
      <AcademicProfileHeader profile={profile} readOnly />

      <section className="mt-4 rounded-[14px] border border-line bg-surface p-4 shadow-[0_3px_18px_rgba(15,23,42,0.03)]">
        <h2 className="text-sm font-semibold text-ink">{t('supervision.section.profile')}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Fact label={t('profile.academicTitle')} value={profile.academicTitle} />
          <Fact label={t('profile.specialty')} value={profile.specialty} />
          <Fact label={t('profile.doctoralSchool')} value={profile.doctoralSchool} />
          <Fact label={t('profile.laboratory')} value={profile.laboratory} />
          <Fact label={t('profile.city')} value={profile.city} />
          <Fact label={t('profile.country')} value={profile.country} />
        </dl>
      </section>

      <section className="mt-4 rounded-[14px] border border-line bg-surface p-4 shadow-[0_3px_18px_rgba(15,23,42,0.03)]">
        <h2 className="text-sm font-semibold text-ink">{t('profile.thesis')}</h2>
        <p className="mt-1 text-base font-semibold tracking-tight text-ink">{thesis.title}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Fact label={t('supervision.university')} value={thesis.institution} />
          <Fact label={t('profile.specialty')} value={thesis.discipline} />
          <Fact
            label={t('supervision.startDate')}
            value={thesis.startedOn ? formatShortDay(thesis.startedOn) : null}
          />
          <Fact
            label={t('thesis.expectedDefense')}
            value={thesis.expectedDefenseOn ? formatShortDay(thesis.expectedDefenseOn) : null}
          />
          <Fact
            label={t('supervision.supervisor')}
            value={thesis.supervisors.map((item) => item.displayName).join(', ')}
          />
          <Fact
            label={t('supervision.objectivesFollowUp')}
            value={t('supervision.objectivesDone', {
              done: data.objectives.completed,
              total: data.objectives.total,
            })}
          />
        </dl>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  const t = useT();
  return (
    <div className="min-w-0 rounded-[10px] border border-line/80 bg-canvas/50 px-3 py-2.5">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-medium text-ink">
        {value && value.length > 0 ? value : t('common.notProvided')}
      </dd>
    </div>
  );
}
