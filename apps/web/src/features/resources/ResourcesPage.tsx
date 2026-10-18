import { Button, Input, Modal, Select, Skeleton, Textarea } from '@thesispartner/ui';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { IconAction } from '../../components/IconAction';
import { useLocale, useT } from '../../i18n/LocaleContext';
import type { IconName } from '../../routes/nav';
import { formatShortDay } from '../dashboard/labels';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import {
  useCreateResource,
  useRemoveResource,
  useResources,
  useUpdateResource,
  type ResourceDraft,
  type SharedResource,
} from './hooks/use-resources';
import { ThesisDocuments } from './ThesisDocuments';

const KINDS = ['COURSE', 'ARTICLE', 'DOCUMENT'] as const;
type Kind = (typeof KINDS)[number];

const KIND_KEY = {
  COURSE: 'resources.kind.course',
  ARTICLE: 'resources.kind.article',
  DOCUMENT: 'resources.kind.document',
} as const;

const SHELF_KEY = {
  COURSE: 'resources.shelf.course',
  ARTICLE: 'resources.shelf.article',
  DOCUMENT: 'resources.shelf.document',
} as const;

const EMPTY_KEY = {
  COURSE: 'resources.shelfEmpty.course',
  ARTICLE: 'resources.shelfEmpty.article',
  DOCUMENT: 'resources.shelfEmpty.document',
} as const;

const ADD_KEY = {
  COURSE: 'resources.addKind.course',
  ARTICLE: 'resources.addKind.article',
  DOCUMENT: 'resources.addKind.document',
} as const;

const SHELF_ICON: Record<Kind, IconName> = {
  COURSE: 'library',
  ARTICLE: 'thesis',
  DOCUMENT: 'deliverables',
};

export function ResourcesPage() {
  const t = useT();
  const { dateLocale } = useLocale();
  const library = useResources();
  const create = useCreateResource();
  const update = useUpdateResource();
  const remove = useRemoveResource();
  const [kind, setKind] = useState<Kind | 'PROPOSED'>('COURSE');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SharedResource | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SharedResource | null>(null);

  const canShare = library.data?.canShare ?? false;
  const resources = library.data?.resources ?? [];
  const query = search.trim().toLowerCase();
  const onShelf = resources.filter((item) => item.kind === kind);
  const visible = onShelf.filter((item) => {
    if (!query) return true;
    return [item.title, item.source, item.summary, item.authorName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="min-w-0">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t('resources.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          {canShare ? t('resources.subtitle') : t('resources.studentSubtitle')}
        </p>
      </header>

      <div className="grid items-start gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          className="flex gap-1 overflow-x-auto rounded-md border border-line bg-surface p-1.5 shadow-control md:sticky md:top-20 md:flex-col md:overflow-visible"
          aria-label={t('resources.title')}
        >
          <button
            type="button"
            aria-current={kind === 'PROPOSED' ? 'true' : undefined}
            onClick={() => setKind('PROPOSED')}
            className={
              kind === 'PROPOSED'
                ? 'flex min-w-44 items-center gap-2.5 rounded-md bg-brand-soft px-2.5 py-2.5 text-left md:min-w-0'
                : 'flex min-w-44 items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-muted hover:bg-brand-soft md:min-w-0'
            }
          >
            <span
              className={
                kind === 'PROPOSED'
                  ? 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface text-brand'
                  : 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand'
              }
            >
              <Icon name="library" className="h-4 w-4" />
            </span>
            <span className={kind === 'PROPOSED' ? 'text-sm font-semibold text-brand' : 'text-sm font-semibold text-ink'}>
              {t('resources.proposed.title')}
            </span>
          </button>
          {KINDS.map((id) => {
            const selected = id === kind;
            const count = resources.filter((item) => item.kind === id).length;
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? 'true' : undefined}
                onClick={() => setKind(id)}
                className={
                  selected
                    ? 'flex min-w-44 items-center gap-2.5 rounded-md bg-brand-soft px-2.5 py-2.5 text-left md:min-w-0'
                    : 'flex min-w-44 items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-muted hover:bg-brand-soft md:min-w-0'
                }
              >
                <span
                  className={
                    selected
                      ? 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface text-brand'
                      : 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand'
                  }
                >
                  <Icon name={SHELF_ICON[id]} className="h-4 w-4" />
                </span>
                <span
                  className={
                    selected
                      ? 'min-w-0 flex-1 text-sm font-semibold text-brand'
                      : 'min-w-0 flex-1 text-sm font-semibold text-ink'
                  }
                >
                  {t(KIND_KEY[id])}
                </span>
                <span
                  className={
                    selected
                      ? 'text-sm font-semibold text-brand tabular-nums'
                      : 'text-sm font-semibold text-muted tabular-nums'
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          {kind === 'PROPOSED' ? (
            <div>
              <h2 className="text-base font-semibold text-ink">{t('resources.proposed.title')}</h2>
              <p className="mt-0.5 mb-4 text-sm text-muted">{t('resources.proposed.shelf')}</p>
              <ThesisDocuments canManage={canShare} />
            </div>
          ) : null}
          {kind !== 'PROPOSED' ? (
          <>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">{t(KIND_KEY[kind])}</h2>
              <p className="mt-0.5 text-sm text-muted">{t(SHELF_KEY[kind])}</p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <input
                type="search"
                value={search}
                placeholder={t('common.search')}
                aria-label={t('common.search')}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm text-ink shadow-control outline-none placeholder:text-muted focus:border-brand sm:w-56"
              />
              {canShare ? (
                <IconAction label={t(ADD_KEY[kind])} icon="plus" onClick={() => setCreating(true)} />
              ) : null}
            </div>
          </div>

          {library.isLoading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : null}
          {library.isError ? <QueryError error={library.error} /> : null}

          {library.data && onShelf.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-surface px-4 py-10 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-brand-soft text-brand">
                <Icon name={SHELF_ICON[kind]} className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{t(EMPTY_KEY[kind])}</p>
            </div>
          ) : null}

          {library.data && onShelf.length > 0 && visible.length === 0 ? (
            <p className="text-sm text-muted">{t('resources.filteredEmpty')}</p>
          ) : null}

          {visible.length > 0 ? (
            <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface shadow-card">
              {visible.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-3 py-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                    <Icon name={SHELF_ICON[item.kind]} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    {item.source ? <p className="mt-0.5 text-xs font-medium text-brand">{item.source}</p> : null}
                    {item.summary ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.summary}</p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-muted">
                      <time dateTime={item.createdAt}>
                        {formatShortDay(item.createdAt.slice(0, 10), dateLocale)}
                      </time>
                      {!canShare && item.authorName
                        ? ` · ${t('resources.sharedBy', { name: item.authorName })}`
                        : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong"
                      >
                        {t('resources.open')}
                      </a>
                    ) : null}
                    {canShare ? (
                      <>
                        <IconAction
                          tone="neutral"
                          icon="pencil"
                          label={t('resources.edit')}
                          onClick={() => setEditing(item)}
                        />
                        <IconAction
                          tone="danger"
                          icon="trash"
                          label={t('common.delete')}
                          onClick={() => setPendingDelete(item)}
                        />
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          </>
          ) : null}
        </section>
      </div>

      <Modal
        open={creating || editing !== null}
        title={
          editing
            ? t('resources.edit')
            : kind === 'PROPOSED'
              ? t('resources.proposed.add')
              : t(ADD_KEY[kind])
        }
        closeLabel={t('common.close')}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      >
        <ResourceForm
          key={editing?.id ?? kind}
          initial={editing}
          lockedKind={editing || kind === 'PROPOSED' ? undefined : kind}
          pending={create.isPending || update.isPending}
          error={editing ? update.error : create.error}
          submitLabel={editing ? t('resources.form.save') : t('resources.form.share')}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={async (body) => {
            if (editing) await update.mutateAsync({ id: editing.id, body });
            else await create.mutateAsync(body);
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <Modal
        open={pendingDelete !== null}
        title={t('resources.deleteTitle')}
        closeLabel={t('common.close')}
        onClose={() => setPendingDelete(null)}
      >
        <p className="text-sm text-muted">{t('resources.deleteBody')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={remove.isPending}
            onClick={() => {
              if (!pendingDelete) return;
              void remove.mutateAsync(pendingDelete.id).then(() => setPendingDelete(null));
            }}
          >
            {t('common.delete')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPendingDelete(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ResourceForm({
  initial,
  lockedKind,
  pending,
  error,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: SharedResource | null;
  lockedKind?: Kind;
  pending: boolean;
  error: unknown;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (body: ResourceDraft) => Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Kind>(lockedKind ?? initial?.kind ?? 'COURSE');
  const [source, setSource] = useState(initial?.source ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
          await onSubmit({
            title,
            kind: lockedKind ?? kind,
            source: source.trim(),
            summary: summary.trim(),
            url: url.trim(),
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {lockedKind ? (
        <p className="text-sm font-medium text-brand">{t(KIND_KEY[lockedKind])}</p>
      ) : (
        <Select
          id="resource-kind"
          label={t('resources.form.kind')}
          value={kind}
          onChange={(event) => setKind(event.target.value as Kind)}
        >
          {KINDS.map((id) => (
            <option key={id} value={id}>
              {t(KIND_KEY[id])}
            </option>
          ))}
        </Select>
      )}
      <Input
        id="resource-title"
        label={t('resources.form.title')}
        value={title}
        maxLength={200}
        required
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        id="resource-source"
        label={t('resources.form.source')}
        hint={t('resources.form.sourceHint')}
        value={source}
        maxLength={200}
        onChange={(event) => setSource(event.target.value)}
      />
      <Input
        id="resource-url"
        label={t('resources.form.url')}
        type="url"
        value={url}
        maxLength={500}
        placeholder="https://"
        onChange={(event) => setUrl(event.target.value)}
      />
      <Textarea
        id="resource-summary"
        label={t('resources.form.summary')}
        value={summary}
        maxLength={2000}
        onChange={(event) => setSummary(event.target.value)}
      />
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {queryErrorMessage(error, t)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || submitting}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
