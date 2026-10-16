import { Avatar, Button, EmptyState, Input, Modal, Skeleton, Textarea } from '@thesispartner/ui';
import { Icon } from '../../../components/Icon';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
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

export function PortfolioWorkspace() {
  const t = useT();
  const portfolio = usePortfolio();
  const [tab, setTab] = useState<Tab>('cv');
  const tabs: Tab[] = ['cv', 'publications', 'projects', 'skills'];

  return (
    <div className="min-w-0">
      <h1 className="sr-only">{t('portfolio.title')}</h1>
      <div
        className="mb-4 flex gap-1 overflow-x-auto rounded-md bg-canvas p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={
              tab === id
                ? 'shrink-0 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                : 'shrink-0 rounded-md px-2.5 py-1 text-xs text-muted hover:text-ink'
            }
            onClick={() => setTab(id)}
          >
            {t(`portfolio.tab.${id}`)}
          </button>
        ))}
      </div>
      {portfolio.isLoading ? (
        <div aria-busy="true">
          <Skeleton className="h-28" />
        </div>
      ) : null}
      {portfolio.isError ? <QueryError error={portfolio.error} /> : null}
      {portfolio.data && tab === 'cv' ? <CvPanel data={portfolio.data} /> : null}
      {portfolio.data && tab === 'publications' ? (
        <PublicationsPanel data={portfolio.data} />
      ) : null}
      {portfolio.data && tab === 'projects' ? <ProjectsPanel data={portfolio.data} /> : null}
      {portfolio.data && tab === 'skills' ? <SkillsPanel data={portfolio.data} /> : null}
    </div>
  );
}

function CvPanel({ data }: { data: Portfolio }) {
  const t = useT();
  const recent = data.publications.slice(0, 4);
  const role = data.profile.specialty
    ? t('portfolio.role', { specialty: data.profile.specialty })
    : (data.profile.academicTitle ?? t('portfolio.roleFallback'));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3">
        <Avatar label={data.profile.displayName} imageUrl={data.profile.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{data.profile.displayName}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">{role}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('portfolio.count.publications')} value={data.counts.publications} />
        <Stat label={t('portfolio.count.conferences')} value={data.counts.conferences} />
        <Stat label={t('portfolio.count.projects')} value={data.counts.projects} />
      </div>
      <section className="overflow-hidden rounded-md border border-line bg-surface">
        <h2 className="border-b border-line px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase">
          {t('portfolio.recent')}
        </h2>
        {recent.length === 0 ? (
          <p className="px-3 py-2.5 text-xs text-muted">{t('portfolio.emptyRecent')}</p>
        ) : (
          <PublicationRows items={recent} />
        )}
      </section>
    </div>
  );
}

function PublicationsPanel({ data }: { data: Portfolio }) {
  const t = useT();
  const add = useAddPublication();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <IconAction
          label={t('portfolio.addPublication')}
          icon="plus"
          onClick={() => setOpen(true)}
        />
      </div>
      {data.publications.length === 0 ? (
        <EmptyState
          title={t('portfolio.emptyPublications')}
          description={t('portfolio.subtitle')}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <PublicationRows items={data.publications} removable />
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
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          {data.projects.map((project) => (
            <li key={project.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{project.title}</span>
                {project.summary ? (
                  <span className="mt-0.5 block text-[11px] text-muted">{project.summary}</span>
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
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
            >
              {skill.label}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
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
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
            <span className="mt-0.5 block truncate text-[11px] text-muted">
              {item.venue}
              <span aria-hidden="true"> · </span>
              {item.year}
              <span aria-hidden="true"> · </span>
              {t(`portfolio.kindLabel.${item.kind}`)}
            </span>
          </span>
          {removable ? (
            <RemoveButton label={item.title} onClick={() => remove.mutate(item.id)} />
          ) : null}
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
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-md text-danger hover:bg-danger-soft"
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
