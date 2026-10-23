import { Avatar, Button, EmptyState, Input, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { IconName } from '../../../routes/nav';
import { useT } from '../../../i18n/LocaleContext';
import { QueryError, queryErrorMessage } from '../../objectives/components/QueryError';
import {
  useAddProject,
  useAddPublication,
  useAddSkill,
  usePortfolio,
  useRemoveProject,
  useRemovePublication,
  useRemoveSkill,
  type Portfolio,
} from '../hooks/use-portfolio';

type Tab = 'cv' | 'publications' | 'projects' | 'skills';
type PublicationFilter = 'all' | 'ARTICLE' | 'CONFERENCE';
const TAB_ICONS = {
  cv: 'profile',
  publications: 'library',
  projects: 'portfolio',
  skills: 'radar',
} satisfies Record<Tab, IconName>;

export function PortfolioWorkspace() {
  const t = useT();
  const portfolio = usePortfolio();
  const [tab, setTab] = useState<Tab>('cv');
  const [publicationKind, setPublicationKind] = useState<PublicationFilter>('all');
  function navigate(next: Tab, kind: PublicationFilter = 'all') {
    setPublicationKind(kind);
    setTab(next);
  }
  const tabs: Tab[] = ['cv', 'publications', 'projects', 'skills'];

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('portfolio.title')}</h1>
      <div
        className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-line/45 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('portfolio.title')}
      >
        {tabs.map((id, index) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-[background-color,box-shadow,color] duration-150 ${
                selected
                  ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                  : 'text-ink/80 hover:bg-surface/70'
              }`}
              onClick={() => navigate(id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tabs.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                const nextTab = tabs[next];
                if (nextTab) navigate(nextTab);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
            >
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  selected ? 'bg-brand-soft text-brand' : 'bg-surface/80 text-muted'
                }`}
              >
                <Icon name={TAB_ICONS[id]} className="h-4 w-4" />
              </span>
              <span
                className={`whitespace-nowrap text-sm ${selected ? 'font-semibold' : 'font-medium'}`}
              >
                {t(`portfolio.tab.${id}`)}
              </span>
            </button>
          );
        })}
      </div>
      {portfolio.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-28" />
        </div>
      ) : null}
      {portfolio.isError ? <QueryError error={portfolio.error} /> : null}
      {portfolio.data && tab === 'cv' ? (
        <CvPanel data={portfolio.data} onNavigate={navigate} />
      ) : null}
      {portfolio.data && tab === 'publications' ? (
        <PublicationsPanel
          data={portfolio.data}
          kind={publicationKind}
          onKind={setPublicationKind}
        />
      ) : null}
      {portfolio.data && tab === 'projects' ? <ProjectsPanel data={portfolio.data} /> : null}
      {portfolio.data && tab === 'skills' ? <SkillsPanel data={portfolio.data} /> : null}
    </div>
  );
}

function CvPanel({
  data,
  onNavigate,
}: {
  data: Portfolio;
  onNavigate: (tab: Tab, kind?: PublicationFilter) => void;
}) {
  const t = useT();
  const recent = [...data.publications].sort((a, b) => b.year - a.year).slice(0, 4);
  const role = data.profile.specialty
    ? t('portfolio.role', { specialty: data.profile.specialty })
    : (data.profile.academicTitle ?? t('portfolio.roleFallback'));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <span className="shrink-0">
            <Avatar label={data.profile.displayName} imageUrl={data.profile.avatarUrl} size="md" />
          </span>
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-ink">{data.profile.displayName}</p>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-muted">{role}</p>
          </div>
        </div>
        <Link
          to="/profil"
          aria-label={t('portfolio.editProfile')}
          title={t('portfolio.editProfile')}
          className="inline-flex items-center gap-2 rounded-lg bg-ink/5 p-2 text-xs font-medium text-ink transition-colors hover:bg-ink/10 sm:px-3"
        >
          <Icon name="pencil" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('portfolio.editProfile')}</span>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          label={t('portfolio.count.publications')}
          value={data.counts.publications}
          icon="library"
          tone="bg-ink/5 text-ink"
          onClick={() => onNavigate('publications', 'ARTICLE')}
        />
        <Stat
          label={t('portfolio.count.conferences')}
          value={data.counts.conferences}
          icon="meetings"
          tone="bg-ink/5 text-ink"
          onClick={() => onNavigate('publications', 'CONFERENCE')}
        />
        <Stat
          label={t('portfolio.count.projects')}
          value={data.counts.projects}
          icon="portfolio"
          tone="bg-ink/5 text-ink"
          onClick={() => onNavigate('projects')}
        />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-[12px] border border-line bg-surface">
          <PanelHeading title={t('portfolio.recent')} onClick={() => onNavigate('publications')} />
          {recent.length === 0 ? (
            <p className="px-4 py-5 text-xs text-muted">{t('portfolio.emptyRecent')}</p>
          ) : (
            <PublicationRows items={recent} />
          )}
        </section>
        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
            <PanelHeading
              title={t('portfolio.tab.projects')}
              onClick={() => onNavigate('projects')}
            />
            {data.projects.length === 0 ? (
              <p className="px-4 py-5 text-xs text-muted">{t('portfolio.emptyProjects')}</p>
            ) : (
              <ul className="divide-y divide-line/80">
                {data.projects.slice(0, 2).map((project) => (
                  <li key={project.id} className="px-4 py-3">
                    <p className="break-words text-sm font-medium text-ink">{project.title}</p>
                    {project.summary ? (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                        {project.summary}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
            <PanelHeading title={t('portfolio.tab.skills')} onClick={() => onNavigate('skills')} />
            {data.skills.length === 0 ? (
              <p className="px-4 py-5 text-xs text-muted">{t('portfolio.emptySkills')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2 p-4">
                {data.skills.slice(0, 6).map((skill) => (
                  <li
                    key={skill.id}
                    className="max-w-full break-words rounded-md bg-canvas px-2 py-1 text-[11px] text-ink"
                  >
                    {skill.label}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function PanelHeading({ title, onClick }: { title: string; onClick: () => void }) {
  const t = useT();
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <h2 className="text-[11px] font-semibold text-ink">{title}</h2>
      <button
        type="button"
        aria-label={t('portfolio.viewSection', { section: title })}
        onClick={onClick}
        className="inline-flex shrink-0 items-center gap-1 text-[11px] text-brand hover:underline"
      >
        {t('portfolio.viewAll')}
        <Icon name="chevron" className="h-3 w-3" />
      </button>
    </header>
  );
}

function PublicationsPanel({
  data,
  kind,
  onKind,
}: {
  data: Portfolio;
  kind: PublicationFilter;
  onKind: (value: PublicationFilter) => void;
}) {
  const t = useT();
  const add = useAddPublication();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const publications = data.publications.filter(
    (item) =>
      (kind === 'all' || item.kind === kind) &&
      (!query || `${item.title} ${item.venue}`.toLocaleLowerCase().includes(query)),
  );
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <IconAction
          label={t('portfolio.addPublication')}
          icon="plus"
          onClick={() => setOpen(true)}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t('portfolio.filterType')}
          className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1"
        >
          {(['all', 'ARTICLE', 'CONFERENCE'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => onKind(value)}
              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${kind === value ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-canvas'}`}
            >
              {value === 'all' ? t('portfolio.allPublications') : t(`portfolio.kindLabel.${value}`)}
            </button>
          ))}
        </div>
        <label className="min-w-40 flex-1 sm:max-w-72">
          <span className="sr-only">{t('common.search')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('common.search')}
            className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-xs outline-none focus:border-brand/50"
          />
        </label>
      </div>
      {data.publications.length === 0 ? (
        <EmptyState
          title={t('portfolio.emptyPublications')}
          description={t('portfolio.subtitle')}
        />
      ) : publications.length === 0 ? (
        <p className="rounded-[12px] border border-line bg-surface px-4 py-8 text-xs text-muted">
          {t('portfolio.noMatchingPublications')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
          <PublicationRows items={publications} removable />
        </div>
      )}
      <Modal
        open={open}
        title={t('portfolio.addPublication')}
        closeLabel={t('common.close')}
        onClose={() => setOpen(false)}
      >
        <PublicationForm
          pending={add.isPending}
          error={add.error}
          onCancel={() => setOpen(false)}
          onSubmit={async (body) => {
            await add.mutateAsync(body);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function ProjectsPanel({ data }: { data: Portfolio }) {
  const t = useT();
  const add = useAddProject();
  const remove = useRemoveProject();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <IconAction label={t('portfolio.addProject')} icon="plus" onClick={() => setOpen(true)} />
      </div>
      {data.projects.length === 0 ? (
        <EmptyState title={t('portfolio.emptyProjects')} description={t('portfolio.subtitle')} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.projects.map((project) => (
            <li
              key={project.id}
              className="flex items-start justify-between gap-3 rounded-[12px] border border-line bg-surface p-4"
            >
              <span className="min-w-0">
                <span className="block break-words text-sm font-medium text-ink">
                  {project.title}
                </span>
                {project.summary ? (
                  <span className="mt-1.5 block break-words text-[11px] leading-relaxed text-muted">
                    {project.summary}
                  </span>
                ) : null}
              </span>
              <RemoveButton label={project.title} onClick={() => remove.mutate(project.id)} />
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        title={t('portfolio.addProject')}
        closeLabel={t('common.close')}
        onClose={() => setOpen(false)}
      >
        <ProjectForm
          pending={add.isPending}
          error={add.error}
          onCancel={() => setOpen(false)}
          onSubmit={async (body) => {
            await add.mutateAsync(body);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function SkillsPanel({ data }: { data: Portfolio }) {
  const t = useT();
  const add = useAddSkill();
  const remove = useRemoveSkill();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <IconAction label={t('portfolio.addSkill')} icon="plus" onClick={() => setOpen(true)} />
      </div>
      {data.skills.length === 0 ? (
        <EmptyState title={t('portfolio.emptySkills')} description={t('portfolio.subtitle')} />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {data.skills.map((skill) => (
            <li
              key={skill.id}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-brand/15 bg-brand-soft/50 py-1 pl-3 pr-1 text-xs text-ink"
            >
              <span className="min-w-0 break-words">{skill.label}</span>
              <RemoveButton label={skill.label} onClick={() => remove.mutate(skill.id)} />
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        title={t('portfolio.addSkill')}
        closeLabel={t('common.close')}
        onClose={() => setOpen(false)}
      >
        <SkillForm
          pending={add.isPending}
          error={add.error}
          onCancel={() => setOpen(false)}
          onSubmit={async (body) => {
            await add.mutateAsync(body);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-w-0 rounded-[12px] border border-line bg-surface p-3 text-left transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-control sm:p-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <Icon
          name="chevron"
          className="hidden h-3.5 w-3.5 text-muted/70 transition-transform group-hover:translate-x-0.5 sm:block"
        />
      </span>
      <span className="mt-2 block break-words text-[11px] text-muted">{label}</span>
      <span className="mt-0.5 block text-lg font-semibold tabular-nums text-ink">{value}</span>
    </button>
  );
}

function PublicationRows({
  items,
  removable = false,
}: {
  items: Portfolio['publications'];
  removable?: boolean;
}) {
  const t = useT();
  const remove = useRemovePublication();
  return (
    <ul className="divide-y divide-line/80">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-4 py-3.5">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.kind === 'ARTICLE' ? 'bg-brand-soft text-brand' : 'bg-violet-soft text-violet'}`}
          >
            <Icon
              name={item.kind === 'ARTICLE' ? 'deliverables' : 'meetings'}
              className="h-4 w-4"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-medium leading-relaxed text-ink">
              {item.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
              <span className="break-words">{item.venue}</span>
              <span className="rounded bg-canvas px-1.5 py-0.5">
                {t(`portfolio.kindLabel.${item.kind}`)}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-md border border-line/80 px-1.5 py-0.5 text-[11px] tabular-nums text-muted">
              {item.year}
            </span>
            {removable ? (
              <RemoveButton label={item.title} onClick={() => remove.mutate(item.id)} />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
      aria-label={`${t('portfolio.remove')} ${label}`}
      title={`${t('portfolio.remove')} ${label}`}
      onClick={onClick}
    >
      <Icon name="trash" className="h-4 w-4" />
    </button>
  );
}

function PublicationForm({
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (body: {
    title: string;
    venue: string;
    year: number;
    kind: 'ARTICLE' | 'CONFERENCE';
  }) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [kind, setKind] = useState<'ARTICLE' | 'CONFERENCE'>('ARTICLE');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ title, venue, year: Number(year), kind });
      }}
    >
      <Input
        id="publication-title"
        label={t('portfolio.itemTitle')}
        value={title}
        maxLength={300}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        id="publication-venue"
        label={t('portfolio.venue')}
        value={venue}
        maxLength={200}
        required
        onChange={(event) => setVenue(event.target.value)}
      />
      <Input
        id="publication-year"
        label={t('portfolio.year')}
        type="number"
        min={1950}
        max={2100}
        value={year}
        required
        onChange={(event) => setYear(event.target.value)}
      />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">{t('portfolio.kind')}</legend>
        <div className="flex gap-2">
          {(['ARTICLE', 'CONFERENCE'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              className={
                kind === value
                  ? 'rounded-md bg-brand px-3 py-1.5 text-xs text-white'
                  : 'rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink'
              }
              onClick={() => setKind(value)}
            >
              {t(`portfolio.kindLabel.${value}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <FormError error={error} />
      <FormActions
        pending={pending}
        submitLabel={t('portfolio.savePublication')}
        onCancel={onCancel}
      />
    </form>
  );
}

function ProjectForm({
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (body: { title: string; summary?: string }) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ title, summary: summary.trim() || undefined });
      }}
    >
      <Input
        id="project-title"
        label={t('portfolio.itemTitle')}
        value={title}
        maxLength={200}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        id="project-summary"
        label={t('portfolio.summary')}
        value={summary}
        maxLength={1000}
        rows={3}
        className="!min-h-16"
        onChange={(event) => setSummary(event.target.value)}
      />
      <FormError error={error} />
      <FormActions
        pending={pending}
        submitLabel={t('portfolio.savePublication')}
        onCancel={onCancel}
      />
    </form>
  );
}

function SkillForm({
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (body: { label: string }) => Promise<void>;
}) {
  const t = useT();
  const [label, setLabel] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({ label });
      }}
    >
      <Input
        id="skill-label"
        label={t('portfolio.skill')}
        value={label}
        maxLength={80}
        required
        onChange={(event) => setLabel(event.target.value)}
      />
      <FormError error={error} />
      <FormActions
        pending={pending}
        submitLabel={t('portfolio.savePublication')}
        onCancel={onCancel}
      />
    </form>
  );
}

function FormError({ error }: { error: unknown }) {
  const t = useT();
  if (!error) return null;
  const message = queryErrorMessage(error, t);
  return (
    <p className="text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

function FormActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
    </div>
  );
}
