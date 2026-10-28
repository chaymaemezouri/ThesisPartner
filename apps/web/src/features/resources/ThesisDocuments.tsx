import { Button, Input, Modal, Select, Textarea } from '@thesispartner/ui';
import { Fragment, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { IconAction } from '../../components/IconAction';
import { useLocale, useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { formatShortDay } from '../dashboard/labels';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import { useSupervisedTheses } from '../supervision/hooks/use-supervised-theses';
import {
  useShareDocuments,
  useSupervisorDocuments,
  useThesisDocumentActions,
  useThesisDocuments,
  type DocumentDraft,
  type ThesisDocument,
} from './hooks/use-thesis-documents';

const KINDS = ['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'REPORT', 'REFERENCE', 'LINK'] as const;
const EDITABLE = new Set(['TO_READ', 'READ', 'SYNTHESIS_DRAFT', 'CHANGES_REQUESTED']);
const STATUS_COLORS: Record<ThesisDocument['status'], string> = {
  TO_READ: 'text-muted',
  READ: 'text-brand',
  SYNTHESIS_DRAFT: 'text-brand',
  SUBMITTED: 'text-violet',
  CHANGES_REQUESTED: 'text-warn',
  VALIDATED: 'text-ok',
};
const COMPACT_CONTROL =
  'h-9 w-full min-w-0 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:border-brand';

function synthesisAction(item: ThesisDocument): MessageKey {
  if (!EDITABLE.has(item.status)) return 'resources.proposed.viewSynthesis';
  return hasSynthesisContent(item)
    ? 'resources.proposed.continueSynthesis'
    : 'resources.proposed.addSynthesis';
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

export function ThesisDocuments({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { dateLocale } = useLocale();
  const supervised = useSupervisedTheses();
  const dashboard = useDashboard();
  const theses = supervised.data?.theses ?? [];
  const [studentFilter, setStudentFilter] = useState('ALL');
  const thesisId = canManage
    ? studentFilter === 'ALL'
      ? (theses[0]?.thesisId ?? null)
      : studentFilter
    : (dashboard.data?.thesis?.id ?? null);
  const desk = useThesisDocuments(thesisId);
  const shared = useSupervisorDocuments(canManage ? theses.map((thesis) => thesis.thesisId) : []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ThesisDocument | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState<'SUPERVISOR' | 'STUDENT'>('SUPERVISOR');

  const tableRows = theses.flatMap((thesis, index) => {
    if (studentFilter !== 'ALL' && thesis.thesisId !== studentFilter) return [];
    const student = thesis.doctoralStudent
      ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
      : thesis.title;
    return (shared[index]?.data?.documents ?? []).map((item) => ({
      thesisId: thesis.thesisId,
      student,
      item,
    }));
  });
  const documents = desk.data?.documents ?? [];
  const summary = desk.data?.summary;
  const loading = canManage ? shared.some((query) => query.isLoading) : desk.isLoading;
  const searchTerms = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
  const matches = (item: ThesisDocument, student = '') => {
    const text = normalizeSearch(
      [
        item.title,
        item.authors,
        item.reference,
        student,
        t(`resources.proposed.source.${item.source}`),
      ].join(' '),
    );
    return (
      searchTerms.every((term) => text.includes(term)) &&
      (kindFilter === 'ALL' || item.kind === kindFilter) &&
      (statusFilter === 'ALL' || item.status === statusFilter)
    );
  };
  const sourceDocuments = canManage
    ? documents
    : documents.filter((item) => item.source === sourceTab);
  const visibleDocuments = sourceDocuments.filter((item) => matches(item));
  const visibleRows = tableRows.filter(({ item, student }) => matches(item, student));
  const supervisorCount = documents.filter((item) => item.source === 'SUPERVISOR').length;
  const studentCount = documents.filter((item) => item.source === 'STUDENT').length;
  const total = canManage ? tableRows.length : sourceDocuments.length;
  const shown = canManage ? visibleRows.length : visibleDocuments.length;
  const hasFilters = search.trim() !== '' || kindFilter !== 'ALL' || statusFilter !== 'ALL';
  const activeFilterCount = Number(kindFilter !== 'ALL') + Number(statusFilter !== 'ALL');
  const resetFilters = () => {
    setSearch('');
    setKindFilter('ALL');
    setStatusFilter('ALL');
    setOpenId(null);
  };

  return (
    <div className="min-w-0">
      {(canManage && theses.length > 1) || !canManage ? (
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {canManage ? (
            <label className="text-sm text-ink">
              {t('resources.proposed.student')}
              <select
                className="mt-1 block w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm sm:w-auto"
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
              >
                <option value="ALL">{t('resources.proposed.allStudents')}</option>
                {theses.map((thesis) => (
                  <option key={thesis.thesisId} value={thesis.thesisId}>
                    {thesis.doctoralStudent
                      ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
                      : thesis.title}
                  </option>
                ))}
              </select>
            </label>
        ) : (
          <>
            <div
              role="tablist"
              aria-label={t('resources.proposed.sourceColumn')}
              className="grid w-full grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1 sm:flex sm:w-auto sm:flex-wrap"
            >
              {(
                [
                  [
                    'SUPERVISOR',
                    'resources.proposed.fromSupervisor',
                    'resources.proposed.source.SUPERVISOR',
                    supervisorCount,
                    'supervision',
                  ],
                  [
                    'STUDENT',
                    'resources.proposed.fromStudent',
                    'resources.proposed.source.STUDENT',
                    studentCount,
                    'profile',
                  ],
                ] as const
              ).map(([id, label, shortLabel, count, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={sourceTab === id}
                  aria-label={`${t(label)} (${count})`}
                  title={`${t(label)} (${count})`}
                  className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium sm:justify-start sm:px-3 sm:py-1.5 ${
                    sourceTab === id ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-canvas'
                  }`}
                  onClick={() => {
                    setSourceTab(id);
                    setOpenId(null);
                  }}
                >
                  <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate sm:hidden">
                    {t(shortLabel)} ({count})
                  </span>
                  <span className="hidden truncate sm:inline">
                    {t(label)} ({count})
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      ) : null}
      {!canManage && sourceTab === 'SUPERVISOR' ? (
        <p className="mb-2 text-xs text-muted">{t('resources.proposed.supervisorSynthesisHint')}</p>
      ) : null}
      {!canManage && summary ? (
        <dl
          aria-label={t('resources.proposed.documentSummary')}
          className="mb-2 grid grid-cols-4 gap-x-2 border-b border-line py-1.5 sm:gap-0 sm:divide-x sm:divide-line sm:py-2"
        >
          <Stat label={t('resources.proposed.proposedCount')} value={summary.proposed} />
          <Stat label={t('resources.proposed.consultedCount')} value={summary.consulted} />
          <Stat label={t('resources.proposed.draftCount')} value={summary.drafts} />
          <Stat label={t('resources.proposed.submittedCount')} value={summary.submitted} />
        </dl>
      ) : null}
      {desk.isError ? <QueryError error={desk.error} /> : null}
      <div role="search" aria-label={t('resources.proposed.search')} className="mb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="grid min-w-[12rem] flex-1 grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_13rem]">
            <div className="relative min-w-0">
              <label htmlFor="document-search" className="sr-only">
                {t('resources.proposed.search')}
              </label>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                id="document-search"
                type="search"
                className={`${COMPACT_CONTROL} pl-8`}
                placeholder={t('resources.proposed.searchHint')}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOpenId(null);
                }}
              />
            </div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="document-filters"
              className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium sm:hidden ${activeFilterCount ? 'border-brand/30 text-brand' : 'border-line bg-surface text-ink'}`}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {t('resources.proposed.filters')}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              <Icon
                name="chevron"
                className={`h-3 w-3 transition-transform ${filtersOpen ? '-rotate-90' : 'rotate-90'}`}
              />
            </button>
            <div
              id="document-filters"
              className={`${filtersOpen ? 'col-span-2 grid' : 'hidden'} grid-cols-2 gap-2 sm:contents`}
            >
              <div className="min-w-0">
                <label htmlFor="document-kind-filter" className="sr-only">
                  {t('resources.proposed.filterKind')}
                </label>
                <select
                  id="document-kind-filter"
                  className={COMPACT_CONTROL}
                  value={kindFilter}
                  onChange={(event) => {
                    setKindFilter(event.target.value);
                    setOpenId(null);
                  }}
                >
                  <option value="ALL">{t('resources.proposed.allKinds')}</option>
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`resources.proposed.kind.${kind}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="document-status-filter" className="sr-only">
                  {t('resources.proposed.filterStatus')}
                </label>
                <select
                  id="document-status-filter"
                  className={COMPACT_CONTROL}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setOpenId(null);
                  }}
                >
                  <option value="ALL">{t('resources.proposed.allStatuses')}</option>
                  {(Object.keys(STATUS_COLORS) as ThesisDocument['status'][]).map((status) => (
                    <option key={status} value={status}>
                      {t(`resources.proposed.status.${status}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {canManage ? (
            <IconAction
              className="shrink-0"
              label={t('resources.proposed.addDocument')}
              icon="plus"
              onClick={() => setCreating(true)}
            />
          ) : (
            <IconAction
              className="shrink-0"
              label={t('resources.proposed.addOwn')}
              icon="plus"
              disabled={!thesisId}
              onClick={() => setCreating(true)}
            />
          )}
          </div>
          <div className="mt-1.5 flex min-h-4 items-center justify-between gap-2 text-xs">
            <p className="text-muted" role="status">
              {t('resources.proposed.resultCount', { shown, total })}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className="font-medium text-brand hover:underline"
                onClick={resetFilters}
              >
                {t('resources.proposed.resetFilters')}
              </button>
            ) : null}
          </div>
        </div>
      {!canManage && desk.data && sourceDocuments.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line bg-surface px-4 py-10 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] bg-brand-soft text-brand">
            <Icon name="library" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">{t('resources.proposed.empty')}</p>
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : hasFilters && shown === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">{t('resources.proposed.noResults')}</p>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-brand hover:underline"
            onClick={resetFilters}
          >
            {t('resources.proposed.resetFilters')}
          </button>
        </div>
      ) : canManage ? (
        <DocumentTable
          rows={visibleRows}
          openId={openId}
          dateLocale={dateLocale}
          objectives={desk.data?.objectives ?? []}
          onToggle={(id) => setOpenId(openId === id ? null : id)}
          onEdit={setEditing}
        />
      ) : documents.length > 0 && thesisId ? (
        <StudentDocumentTable
          thesisId={thesisId}
          documents={visibleDocuments}
          openId={openId}
          dateLocale={dateLocale}
          objectives={desk.data?.objectives ?? []}
          onToggle={(id) => setOpenId(openId === id ? null : id)}
          onEdit={setEditing}
        />
      ) : null}
      {creating || editing !== null ? (
        <DocumentForm
          key={editing?.id ?? 'new'}
          open={creating || editing !== null}
          thesisId={
            canManage
              ? studentFilter === 'ALL'
                ? (theses[0]?.thesisId ?? thesisId ?? '')
                : studentFilter
              : (thesisId ?? '')
          }
          theses={
            canManage
              ? theses.map((thesis) => ({
                  thesisId: thesis.thesisId,
                  label: thesis.doctoralStudent
                    ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
                    : thesis.title,
                }))
              : []
          }
          initial={editing}
          studentMode={!canManage}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

type DocumentTableRow = {
  thesisId: string;
  student: string;
  item: ThesisDocument;
};

function hasSynthesisContent(item: ThesisDocument) {
  return Boolean(
    item.summary ||
    item.methodology ||
    item.results ||
    item.limits ||
    item.thesisLink ||
    item.exploitation ||
    item.synthesisFileName ||
    (item.status !== 'TO_READ' && item.status !== 'READ'),
  );
}

function downloadSynthesis(item: ThesisDocument, student: string) {
  const blocks = [
    item.title,
    student,
    item.status,
    '',
    item.summary ? `Summary\n${item.summary}` : null,
    item.methodology ? `Methodology\n${item.methodology}` : null,
    item.results ? `Results\n${item.results}` : null,
    item.limits ? `Limits\n${item.limits}` : null,
    item.thesisLink ? `Link with the thesis\n${item.thesisLink}` : null,
    item.exploitation ? `Ways to use it\n${item.exploitation}` : null,
    item.subjectRelevance !== 'UNSET' ? `Subject relevance\n${item.subjectRelevance}` : null,
  ].filter(Boolean);
  const blob = new Blob([blocks.join('\n\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${item.title.replace(/[^\w-]+/g, '_').slice(0, 60) || 'synthesis'}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function StudentDocumentTable({
  thesisId,
  documents,
  openId,
  dateLocale,
  objectives,
  onToggle,
  onEdit,
}: {
  thesisId: string;
  documents: ThesisDocument[];
  openId: string | null;
  dateLocale: string;
  objectives: DocumentDeskObjectives;
  onToggle: (id: string) => void;
  onEdit: (item: ThesisDocument) => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  return (
    <div className="rounded-lg border border-line bg-surface">
      {actions.consult.error || actions.remove.error ? (
        <p role="alert" className="border-b border-line px-3 py-2 text-xs text-danger">
          {queryErrorMessage(actions.consult.error ?? actions.remove.error, t)}
        </p>
      ) : null}
      <table
        aria-label={t('resources.proposed.myDocuments')}
        className="block w-full border-collapse text-left text-sm lg:table"
      >
        <thead className="hidden lg:table-header-group">
          <tr className="border-b border-line bg-canvas text-xs text-muted">
            <th className="px-3 py-2 font-medium">{t('resources.form.title')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.filterKind')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.statusColumn')}</th>
            <th className="px-3 py-2 font-medium">
              {t('resources.proposed.subjectRelevanceShort')}
            </th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.dateColumn')}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t('resources.proposed.actionsColumn')}
            </th>
          </tr>
        </thead>
        <tbody className="block lg:table-row-group">
          {documents.map((item) => {
            const open = openId === item.id;
            const hasResource = Boolean(item.url || item.fileName) && item.access !== 'PROTECTED';
            const openResource = () => {
              if (item.url) {
                void actions.consult.mutate(item.id);
                window.open(item.url, '_blank', 'noopener');
                return;
              }
              if (item.fileName) void actions.openFile(item.id, true);
            };
            const kindLabel = t(`resources.proposed.kind.${item.kind}` as MessageKey);
            const statusLabel = t(`resources.proposed.status.${item.status}` as MessageKey);
            const dateLabel = formatShortDay(item.sharedOn, dateLocale);
            const relevanceControl = EDITABLE.has(item.status) ? (
              <select
                className="w-full rounded-md border border-line bg-surface px-2.5 py-2 text-xs text-ink lg:w-auto lg:max-w-full lg:py-1"
                aria-label={t('resources.proposed.subjectRelevance')}
                value={item.subjectRelevance}
                disabled={actions.synthesis.isPending}
                onChange={(event) => {
                  const value = event.target.value as 'UNSET' | 'IMPORTANT' | 'NOT_IMPORTANT';
                  actions.synthesis.mutate({
                    id: item.id,
                    body: {
                      summary: item.summary ?? '',
                      methodology: item.methodology ?? '',
                      results: item.results ?? '',
                      limits: item.limits ?? '',
                      thesisLink: item.thesisLink ?? '',
                      exploitation: item.exploitation ?? '',
                      subjectRelevance: value,
                      objectiveId: item.objectiveId ?? '',
                      taskId: item.taskId ?? '',
                    },
                  });
                }}
              >
                <option value="UNSET">{t('resources.proposed.subjectRelevanceLevel.UNSET')}</option>
                <option value="IMPORTANT">
                  {t('resources.proposed.subjectRelevanceLevel.IMPORTANT')}
                </option>
                <option value="NOT_IMPORTANT">
                  {t('resources.proposed.subjectRelevanceLevel.NOT_IMPORTANT')}
                </option>
              </select>
            ) : (
              <span className="text-xs text-muted">
                {t(
                  `resources.proposed.subjectRelevanceLevel.${item.subjectRelevance}` as MessageKey,
                )}
              </span>
            );
            return (
              <Fragment key={item.id}>
                <tr
                  className={`grid grid-cols-1 gap-3 border-b border-line px-3 py-3 transition-colors last:border-0 lg:table-row lg:gap-0 lg:p-0 ${open ? 'bg-canvas' : 'hover:bg-canvas/70'}`}
                >
                  <td className="min-w-0 font-medium text-ink lg:w-[28%] lg:px-3 lg:py-4">
                    <button
                      type="button"
                      className="text-left [overflow-wrap:anywhere] hover:text-brand"
                      aria-expanded={open}
                      aria-controls={`document-details-${item.id}`}
                      onClick={() => onToggle(item.id)}
                    >
                      {item.title}
                    </button>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted lg:hidden">
                      <span>{kindLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${STATUS_COLORS[item.status]}`}>
                        {statusLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dateLabel}</span>
                    </p>
                  </td>
                  <td className="hidden text-muted lg:table-cell lg:px-3 lg:py-4">{kindLabel}</td>
                  <td className="hidden lg:table-cell lg:px-3 lg:py-4">
                    <span className={`text-[11px] font-medium ${STATUS_COLORS[item.status]}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="min-w-0 lg:px-3 lg:py-4">
                    <span className="mb-1.5 block text-[11px] text-muted lg:mb-0 lg:hidden">
                      {t('resources.proposed.subjectRelevanceShort')}
                    </span>
                    {relevanceControl}
                  </td>
                  <td className="hidden whitespace-nowrap text-muted lg:table-cell lg:px-3 lg:py-4">
                    {dateLabel}
                  </td>
                  <td className="min-w-0 lg:px-3 lg:py-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-2">
                      <div className="grid grid-cols-2 gap-2 lg:contents">
                        {hasResource ? (
                          <>
                            <Button
                              variant="secondary"
                              className="h-9 px-2.5 text-xs lg:h-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                openResource();
                              }}
                            >
                              <Icon name="eye" className="h-3.5 w-3.5" />
                              {t('resources.proposed.open')}
                            </Button>
                            {item.fileName ? (
                              <Button
                                variant="secondary"
                                className="h-9 px-2.5 text-xs lg:h-8"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void actions.openFile(item.id, false);
                                }}
                              >
                                <Icon name="download" className="h-3.5 w-3.5" />
                                {t('resources.proposed.download')}
                              </Button>
                            ) : (
                              <span className="lg:hidden" />
                            )}
                          </>
                        ) : item.status === 'TO_READ' ? (
                          <Button
                            variant="secondary"
                            className="col-span-2 h-9 px-2.5 text-xs lg:col-auto lg:h-8"
                            disabled={actions.consult.isPending}
                            onClick={() => actions.consult.mutate(item.id)}
                          >
                            {t('resources.proposed.consult')}
                          </Button>
                        ) : null}
                      </div>
                      <Button
                        className="h-9 w-full px-2.5 text-xs lg:h-8 lg:w-auto"
                        variant={
                          open ? 'secondary' : EDITABLE.has(item.status) ? 'primary' : 'secondary'
                        }
                        aria-expanded={open}
                        aria-controls={`document-details-${item.id}`}
                        onClick={() => onToggle(item.id)}
                      >
                        {open ? t('common.close') : t(synthesisAction(item))}
                        <Icon
                          name="chevron"
                          className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                      </Button>
                      {item.mine ? (
                        <div className="flex items-center justify-end gap-0.5 lg:contents">
                          <IconAction
                            icon="pencil"
                            tone="neutral"
                            label={`${t('resources.edit')} — ${item.title}`}
                            onClick={() => onEdit(item)}
                          />
                          <IconAction
                            icon="trash"
                            tone="danger"
                            label={`${t('common.delete')} — ${item.title}`}
                            disabled={actions.remove.isPending}
                            onClick={() => actions.remove.mutate(item.id)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {open ? (
                  <tr
                    id={`document-details-${item.id}`}
                    className="block border-b border-line bg-canvas/40 lg:table-row"
                  >
                    <td className="block px-3 py-3 lg:table-cell" colSpan={6}>
                      <DocumentRow
                        thesisId={thesisId}
                        item={item}
                        canManage={false}
                        open
                        detailsOnly
                        objectives={objectives}
                        onToggle={() => onToggle(item.id)}
                        onEdit={() => onEdit(item)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocumentTable({
  rows,
  openId,
  dateLocale,
  objectives,
  onToggle,
  onEdit,
}: {
  rows: DocumentTableRow[];
  openId: string | null;
  dateLocale: string;
  objectives: DocumentDeskObjectives;
  onToggle: (id: string) => void;
  onEdit: (item: ThesisDocument) => void;
}) {
  const t = useT();
  const [remarking, setRemarking] = useState<DocumentTableRow | null>(null);
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="px-3 py-2 font-medium">{t('resources.form.title')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.student')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.filterKind')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.readColumn')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.synthesisColumn')}</th>
            <th className="px-3 py-2 font-medium">{t('resources.proposed.dateColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-muted" colSpan={6}>
                {t('resources.proposed.empty')}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const open = openId === row.item.id;
            const read = row.item.status !== 'TO_READ';
            const synthesis = hasSynthesisContent(row.item);
            return (
              <Fragment key={`${row.thesisId}-${row.item.id}`}>
                <tr
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas/70"
                  onClick={() => onToggle(row.item.id)}
                >
                  <td className="px-3 py-2 font-medium text-ink">
                    <span className="block">{row.item.title}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-muted">
                      {t(`resources.proposed.source.${row.item.source}` as MessageKey)}
                      {row.item.subjectRelevance !== 'UNSET'
                        ? ` · ${t(`resources.proposed.subjectRelevanceLevel.${row.item.subjectRelevance}` as MessageKey)}`
                        : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink">{row.student}</td>
                  <td className="px-3 py-2 text-muted">
                    {t(`resources.proposed.kind.${row.item.kind}` as MessageKey)}
                  </td>
                  <td className="px-3 py-2">
                    {read ? t('resources.proposed.readYes') : t('resources.proposed.readNo')}
                  </td>
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {synthesis
                          ? t('resources.proposed.synthesisYes')
                          : t('resources.proposed.synthesisNo')}
                      </span>
                      <IconAction
                        tone="neutral"
                        icon="download"
                        label={t('resources.proposed.downloadSynthesis')}
                        disabled={!synthesis}
                        title={
                          synthesis
                            ? t('resources.proposed.downloadSynthesis')
                            : t('resources.proposed.noSynthesisYet')
                        }
                        onClick={() => {
                          if (synthesis) downloadSynthesis(row.item, row.student);
                        }}
                      />
                      <IconAction
                        tone="neutral"
                        icon="remarks"
                        label={t('resources.proposed.addRemark')}
                        onClick={() => setRemarking(row)}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">
                    {formatShortDay(row.item.sharedOn, dateLocale)}
                  </td>
                </tr>
                {open ? (
                  <tr className="border-b border-line">
                    <td className="px-3 py-3" colSpan={6}>
                      <DocumentRow
                        thesisId={row.thesisId}
                        item={row.item}
                        canManage
                        open
                        detailsOnly
                        objectives={objectives}
                        onToggle={() => onToggle(row.item.id)}
                        onEdit={() => onEdit(row.item)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {remarking ? (
        <Modal
          open
          title={t('resources.proposed.addRemark')}
          closeLabel={t('common.close')}
          onClose={() => setRemarking(null)}
        >
          <div className="grid gap-3">
            <p className="text-sm font-medium text-ink">{remarking.item.title}</p>
            <p className="text-xs text-muted">{remarking.student}</p>
            <SynthesisRead item={remarking.item} thesisId={remarking.thesisId} />
            {remarking.item.status === 'SUBMITTED' ? (
              <ReviewForm
                thesisId={remarking.thesisId}
                documentId={remarking.item.id}
                onDone={() => setRemarking(null)}
              />
            ) : (
              <p className="text-sm text-muted">{t('resources.proposed.noSynthesisYet')}</p>
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function DocumentRow({
  thesisId,
  item,
  canManage,
  open,
  detailsOnly = false,
  objectives,
  onToggle,
  onEdit,
}: {
  thesisId: string;
  item: ThesisDocument;
  canManage: boolean;
  open: boolean;
  detailsOnly?: boolean;
  objectives: DocumentDeskObjectives;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  const shown = detailsOnly || open;
  const Tag = detailsOnly ? 'div' : 'li';
  const openResource = () => {
    if (item.url) {
      if (!canManage) void actions.consult.mutate(item.id);
      window.open(item.url, '_blank', 'noopener');
      return;
    }
    if (item.fileName) {
      void actions.openFile(item.id, true);
      return;
    }
    if (!canManage && item.status === 'TO_READ') {
      actions.consult.mutate(item.id);
    }
  };
  const hasResource = Boolean(item.url || item.fileName);
  return (
    <Tag className={detailsOnly ? '' : 'bg-surface'}>
      {detailsOnly ? null : (
        <div className="flex items-start gap-3 px-3 py-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={onToggle}
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand">
              <Icon name="library" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{item.title}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {t(`resources.proposed.kind.${item.kind}` as MessageKey)}
                {item.authors ? ` · ${item.authors}` : ''}
                {item.objectiveTitle ? ` · ${item.objectiveTitle}` : ''}
                {item.dueDate ? ` · ${item.dueDate}` : ''}
              </span>
              <span className="mt-1.5 inline-flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-line bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
                  {t(`resources.proposed.source.${item.source}` as MessageKey)}
                </span>
                <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                  {t(`resources.proposed.status.${item.status}` as MessageKey)}
                </span>
                {item.subjectRelevance !== 'UNSET' ? (
                  <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink">
                    {t(
                      `resources.proposed.subjectRelevanceLevel.${item.subjectRelevance}` as MessageKey,
                    )}
                  </span>
                ) : null}
                {item.overdue ? (
                  <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                    {t('resources.proposed.overdueCount')}
                  </span>
                ) : null}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            {hasResource && item.access !== 'PROTECTED' ? (
              <Button
                className="h-8 px-3 text-xs"
                onClick={(event) => {
                  event.stopPropagation();
                  openResource();
                }}
              >
                {t('resources.proposed.open')}
              </Button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink shadow-control transition-colors hover:border-brand/35 hover:bg-brand-soft/60 hover:text-brand"
              onClick={onToggle}
            >
              {open ? t('common.close') : t('resources.proposed.synthesisColumn')}
              <Icon name="chevron" className={`h-3.5 w-3.5 ${open ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      )}
      {shown ? (
        <div className={detailsOnly ? '' : 'border-t border-line px-3 pb-3 pt-3'}>
          {item.reference ? <p className="text-sm text-ink">{item.reference}</p> : null}
          {item.instructions ? (
            <p className="mt-1 text-sm text-muted">{item.instructions}</p>
          ) : null}
          {item.access === 'PROTECTED' && !canManage ? (
            <div className="mt-2">
              <p className="text-sm text-warn">{t('resources.proposed.protected')}</p>
              {!detailsOnly && item.status === 'TO_READ' ? (
                <Button
                  className="mt-2"
                  variant="secondary"
                  onClick={() => actions.consult.mutate(item.id)}
                >
                  {t('resources.proposed.consult')}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.url && !detailsOnly ? (
                <Button variant="secondary" className="h-8 px-3 text-xs" onClick={openResource}>
                  {t('resources.proposed.open')}
                </Button>
              ) : null}
              {item.fileName ? (
                <>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => void actions.openFile(item.id, true)}
                  >
                    {item.fileName}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => void actions.openFile(item.id, false)}
                  >
                    {t('resources.proposed.download')}
                  </Button>
                </>
              ) : null}
              {!detailsOnly &&
              !canManage &&
              item.status === 'TO_READ' &&
              !item.url &&
              !item.fileName ? (
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  onClick={() => actions.consult.mutate(item.id)}
                >
                  {t('resources.proposed.consult')}
                </Button>
              ) : null}
            </div>
          )}
          {item.reviewMessage ? (
            <p className="mt-2 text-sm text-ink">{item.reviewMessage}</p>
          ) : null}
          {!canManage && EDITABLE.has(item.status) ? (
            <SynthesisForm thesisId={thesisId} item={item} objectives={objectives} />
          ) : !canManage ? (
            <SynthesisRead
              item={item}
              thesisId={thesisId}
              canUploadFile={item.status === 'SUBMITTED' || item.status === 'VALIDATED'}
            />
          ) : null}
          {canManage && item.status === 'SUBMITTED' ? (
            <ReviewForm thesisId={thesisId} documentId={item.id} />
          ) : null}
          {canManage && item.status !== 'SUBMITTED' ? (
            <SynthesisRead item={item} thesisId={thesisId} />
          ) : null}
          {canManage || (item.mine && !detailsOnly) ? (
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={onEdit}>
                {t('resources.edit')}
              </Button>
              <Button
                variant="secondary"
                disabled={actions.remove.isPending}
                onClick={() => actions.remove.mutate(item.id)}
              >
                {t('common.delete')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Tag>
  );
}

type DocumentDeskObjectives = Array<{
  id: string;
  title: string;
  steps: Array<{ id: string; title: string }>;
}>;

function SynthesisForm({
  thesisId,
  item,
  objectives,
}: {
  thesisId: string;
  item: ThesisDocument;
  objectives: DocumentDeskObjectives;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  const [summary, setSummary] = useState(item.summary ?? '');
  const [methodology, setMethodology] = useState(item.methodology ?? '');
  const [results, setResults] = useState(item.results ?? '');
  const [limits, setLimits] = useState(item.limits ?? '');
  const [thesisLink, setThesisLink] = useState(item.thesisLink ?? '');
  const [exploitation, setExploitation] = useState(item.exploitation ?? '');
  const [objectiveId, setObjectiveId] = useState(item.objectiveId ?? '');
  const [taskId, setTaskId] = useState(item.taskId ?? '');
  const [subjectRelevance, setSubjectRelevance] = useState<'UNSET' | 'IMPORTANT' | 'NOT_IMPORTANT'>(
    item.subjectRelevance ?? 'UNSET',
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [summaryError, setSummaryError] = useState(false);
  const [saved, setSaved] = useState(false);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const steps = objectives.find((objective) => objective.id === objectiveId)?.steps ?? [];
  const body = {
    summary,
    methodology,
    results,
    limits,
    thesisLink,
    exploitation,
    subjectRelevance,
    objectiveId,
    taskId,
  };
  const hasFileOrSummary = Boolean(summary.trim() || item.synthesisFileName);
  const continueToRelevance = () => {
    if (!hasFileOrSummary) {
      setSummaryError(true);
      summaryRef.current?.focus();
      return;
    }
    setSummaryError(false);
    setStep(2);
    stepHeadingRef.current?.focus();
  };
  return (
    <form
      aria-label={`${t('resources.proposed.synthesisColumn')} — ${item.title}`}
      className="mt-3 grid gap-4"
      onChange={() => setSaved(false)}
      onSubmit={(event) => {
        event.preventDefault();
        if (actions.synthesis.isPending || actions.uploadSynthesis.isPending) return;
        if (step === 1) {
          continueToRelevance();
          return;
        }
        if (!hasFileOrSummary || subjectRelevance === 'UNSET') return;
        actions.synthesis.mutate({ id: item.id, body: { ...body, submit: true } });
      }}
    >
      <ol
        className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-3 text-xs"
        aria-label={t('resources.proposed.synthesisSteps')}
      >
        <li
          aria-current={step === 1 ? 'step' : undefined}
          className={step === 1 ? 'font-semibold text-ink' : 'text-muted'}
        >
          {t('resources.proposed.writeSynthesisStep')}
        </li>
        <li
          aria-current={step === 2 ? 'step' : undefined}
          className={step === 2 ? 'font-semibold text-ink' : 'text-muted'}
        >
          {t('resources.proposed.relevanceStep')}
        </li>
      </ol>
      <h3 ref={stepHeadingRef} tabIndex={-1} className="text-sm font-medium text-ink">
        {t(
          step === 1 ? 'resources.proposed.writeSynthesis' : 'resources.proposed.researchRelevance',
        )}
      </h3>
      <fieldset disabled={actions.synthesis.isPending} className="grid min-w-0 gap-3">
        <legend className="sr-only">
          {t(
            step === 1
              ? 'resources.proposed.writeSynthesis'
              : 'resources.proposed.researchRelevance',
          )}
        </legend>
        {step === 1 ? (
          <>
            <p className="text-xs text-muted">{t('resources.proposed.synthesisFileHint')}</p>
            <div className="grid gap-2 rounded-md border border-line bg-surface px-3 py-3">
              <p className="text-xs font-semibold text-muted">
                {t('resources.proposed.synthesisFile')}
              </p>
              {item.synthesisFileName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink">{item.synthesisFileName}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => void actions.openSynthesisFile(item.id, true)}
                  >
                    {t('resources.proposed.openSynthesisFile')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => void actions.openSynthesisFile(item.id, false)}
                  >
                    {t('resources.proposed.downloadSynthesisFile')}
                  </Button>
                </div>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-brand">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={actions.uploadSynthesis.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setSummaryError(false);
                    actions.uploadSynthesis.mutate({ id: item.id, file });
                  }}
                />
                <Icon name="plus" className="h-4 w-4" />
                {item.synthesisFileName
                  ? t('resources.proposed.replaceSynthesis')
                  : t('resources.proposed.uploadSynthesis')}
              </label>
              {actions.uploadSynthesis.error ? (
                <p className="text-sm text-danger">
                  {queryErrorMessage(actions.uploadSynthesis.error, t)}
                </p>
              ) : null}
            </div>
            <Textarea
              ref={summaryRef}
              id={`sum-${item.id}`}
              label={t('resources.proposed.summary')}
              value={summary}
              maxLength={4000}
              error={summaryError && !hasFileOrSummary ? t('common.requiredField') : undefined}
              onChange={(event) => setSummary(event.target.value)}
            />
            <details className="rounded-md border border-line bg-surface px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted">
                {t('resources.proposed.synthesisDetails')}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Textarea
                  id={`met-${item.id}`}
                  label={t('resources.proposed.methodology')}
                  value={methodology}
                  maxLength={4000}
                  onChange={(event) => setMethodology(event.target.value)}
                />
                <Textarea
                  id={`res-${item.id}`}
                  label={t('resources.proposed.results')}
                  value={results}
                  maxLength={4000}
                  onChange={(event) => setResults(event.target.value)}
                />
                <Textarea
                  id={`lim-${item.id}`}
                  label={t('resources.proposed.limits')}
                  value={limits}
                  maxLength={4000}
                  onChange={(event) => setLimits(event.target.value)}
                />
                <Textarea
                  id={`link-${item.id}`}
                  label={t('resources.proposed.thesisLink')}
                  value={thesisLink}
                  maxLength={4000}
                  onChange={(event) => setThesisLink(event.target.value)}
                />
                <Textarea
                  id={`use-${item.id}`}
                  label={t('resources.proposed.exploitation')}
                  value={exploitation}
                  maxLength={4000}
                  onChange={(event) => setExploitation(event.target.value)}
                />
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="text-xs text-muted">{t('resources.proposed.relevanceHint')}</p>
            <Select
              id={`rel-${item.id}`}
              label={t('resources.proposed.subjectRelevance')}
              value={subjectRelevance}
              onChange={(event) =>
                setSubjectRelevance(event.target.value as typeof subjectRelevance)
              }
            >
              <option value="UNSET">{t('resources.proposed.chooseRelevance')}</option>
              <option value="IMPORTANT">
                {t('resources.proposed.subjectRelevanceLevel.IMPORTANT')}
              </option>
              <option value="NOT_IMPORTANT">
                {t('resources.proposed.subjectRelevanceLevel.NOT_IMPORTANT')}
              </option>
            </Select>
            {objectives.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id={`doc-obj-${item.id}`}
                  label={t('resources.proposed.objective')}
                  value={objectiveId}
                  onChange={(event) => {
                    setObjectiveId(event.target.value);
                    setTaskId('');
                  }}
                >
                  <option value="">{t('resources.proposed.none')}</option>
                  {objectives.map((objective) => (
                    <option key={objective.id} value={objective.id}>
                      {objective.title}
                    </option>
                  ))}
                </Select>
                <Select
                  id={`doc-step-${item.id}`}
                  label={t('resources.proposed.step')}
                  value={taskId}
                  disabled={!objectiveId}
                  onChange={(event) => setTaskId(event.target.value)}
                >
                  <option value="">{t('resources.proposed.none')}</option>
                  {steps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.title}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </>
        )}
      </fieldset>
      {actions.synthesis.error ? (
        <p role="alert" className="text-sm text-danger">
          {queryErrorMessage(actions.synthesis.error, t)}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="text-xs text-ok">
          {t('resources.proposed.draftSaved')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {step === 2 ? (
          <Button
            variant="ghost"
            disabled={actions.synthesis.isPending}
            onClick={() => {
              setStep(1);
              stepHeadingRef.current?.focus();
            }}
          >
            {t('common.back')}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={actions.synthesis.isPending}
          onClick={() =>
            actions.synthesis.mutate({ id: item.id, body }, { onSuccess: () => setSaved(true) })
          }
        >
          {t('resources.proposed.saveDraft')}
        </Button>
        {step === 1 ? (
          <Button
            key="continue"
            type="button"
            disabled={actions.synthesis.isPending}
            onClick={(event) => {
              event.preventDefault();
              continueToRelevance();
            }}
          >
            {t('resources.proposed.continueToRelevance')}
            <Icon name="chevron" className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            key="submit"
            type="submit"
            disabled={
              actions.synthesis.isPending ||
              actions.uploadSynthesis.isPending ||
              subjectRelevance === 'UNSET' ||
              !hasFileOrSummary
            }
          >
            {t('resources.proposed.submit')}
          </Button>
        )}
      </div>
    </form>
  );
}

function SynthesisRead({
  item,
  thesisId,
  canUploadFile = false,
}: {
  item: ThesisDocument;
  thesisId?: string;
  canUploadFile?: boolean;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId ?? '');
  const fields = [
    [t('resources.proposed.summary'), item.summary],
    [t('resources.proposed.methodology'), item.methodology],
    [t('resources.proposed.results'), item.results],
    [t('resources.proposed.limits'), item.limits],
    [t('resources.proposed.thesisLink'), item.thesisLink],
    [t('resources.proposed.exploitation'), item.exploitation],
  ] as const;
  if (
    fields.every((field) => !field[1]) &&
    item.subjectRelevance === 'UNSET' &&
    !item.synthesisFileName &&
    !canUploadFile
  ) {
    return null;
  }
  return (
    <div className="mt-3 grid gap-2">
      {item.subjectRelevance !== 'UNSET' ? (
        <p className="text-sm text-ink">
          <span className="font-medium">{t('resources.proposed.subjectRelevance')} </span>
          {t(`resources.proposed.subjectRelevanceLevel.${item.subjectRelevance}` as MessageKey)}
        </p>
      ) : null}
      {item.synthesisFileName && thesisId ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <span className="font-medium">{t('resources.proposed.synthesisFile')}. </span>
          <span>{item.synthesisFileName}</span>
          <Button
            type="button"
            variant="secondary"
            className="h-8 px-2.5 text-xs"
            onClick={() => void actions.openSynthesisFile(item.id, false)}
          >
            {t('resources.proposed.downloadSynthesisFile')}
          </Button>
        </div>
      ) : item.synthesisFileName ? (
        <p className="text-sm text-ink">
          <span className="font-medium">{t('resources.proposed.synthesisFile')}. </span>
          {item.synthesisFileName}
        </p>
      ) : null}
      {canUploadFile && thesisId ? (
        <div className="grid gap-2 rounded-md border border-line bg-surface px-3 py-3">
          <p className="text-xs text-muted">{t('resources.proposed.synthesisFileHint')}</p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand">
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              disabled={actions.uploadSynthesis.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                actions.uploadSynthesis.mutate({ id: item.id, file });
              }}
            />
            <Icon name="plus" className="h-4 w-4" />
            {item.synthesisFileName
              ? t('resources.proposed.replaceSynthesis')
              : t('resources.proposed.uploadSynthesis')}
          </label>
          {actions.uploadSynthesis.error ? (
            <p className="text-sm text-danger">
              {queryErrorMessage(actions.uploadSynthesis.error, t)}
            </p>
          ) : null}
        </div>
      ) : null}
      {fields.map(([label, value]) =>
        value ? (
          <p key={label} className="text-sm text-ink">
            <span className="font-medium">{label}. </span>
            {value}
          </p>
        ) : null,
      )}
    </div>
  );
}

function ReviewForm({
  thesisId,
  documentId,
  onDone,
}: {
  thesisId: string;
  documentId: string;
  onDone?: () => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  const [message, setMessage] = useState('');
  return (
    <div className="mt-3 grid gap-2">
      <Textarea
        id={`review-${documentId}`}
        label={t('resources.proposed.remark')}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      {actions.review.error ? (
        <p className="text-sm text-danger">{queryErrorMessage(actions.review.error, t)}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={actions.review.isPending}
          onClick={() =>
            void actions.review
              .mutateAsync({ id: documentId, decision: 'VALIDATED', message })
              .then(() => onDone?.())
          }
        >
          {t('resources.proposed.validate')}
        </Button>
        <Button
          variant="secondary"
          disabled={actions.review.isPending || message.trim().length === 0}
          onClick={() =>
            void actions.review
              .mutateAsync({ id: documentId, decision: 'CHANGES_REQUESTED', message })
              .then(() => onDone?.())
          }
        >
          {t('resources.proposed.requestChanges')}
        </Button>
      </div>
    </div>
  );
}

function DocumentForm({
  open,
  thesisId,
  theses,
  initial,
  studentMode = false,
  onClose,
}: {
  open: boolean;
  thesisId: string;
  theses: Array<{ thesisId: string; label: string }>;
  initial: ThesisDocument | null;
  studentMode?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  const share = useShareDocuments();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<DocumentDraft['kind']>(initial?.kind ?? 'ARTICLE');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [access, setAccess] = useState<DocumentDraft['access']>(initial?.access ?? 'SHARED');
  const [audience, setAudience] = useState<'ALL' | 'ONE'>('ALL');
  const [targetThesis, setTargetThesis] = useState(thesisId || theses[0]?.thesisId || '');
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal
      open={open}
      title={
        initial
          ? t('resources.edit')
          : studentMode
            ? t('resources.proposed.addOwn')
            : t('resources.proposed.addDocument')
      }
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const body: DocumentDraft = {
            title,
            kind,
            url: url.trim(),
            access: studentMode ? 'SHARED' : audience === 'ALL' ? 'SHARED' : access,
            importance: 'MEDIUM',
            priority: 'NORMAL',
          };
          const saved = initial
            ? actions.update.mutateAsync({ id: initial.id, body }).then(async (desk) => {
                const created = desk.documents.find((item) => item.id === initial.id);
                if (file && created) await actions.upload.mutateAsync({ id: created.id, file });
              })
            : studentMode
              ? actions.create.mutateAsync(body).then(async (desk) => {
                  if (!file) return;
                  const fresh = desk.documents
                    .filter((item) => item.mine && item.title === body.title)
                    .sort((a, b) => b.sharedOn.localeCompare(a.sharedOn))[0];
                  if (fresh) await actions.upload.mutateAsync({ id: fresh.id, file });
                })
              : share.mutateAsync({
                  thesisIds:
                    audience === 'ALL' ? theses.map((thesis) => thesis.thesisId) : [targetThesis],
                  body,
                  file,
                });
          void saved.then(() => onClose());
        }}
      >
        <Input
          id="doc-title"
          label={t('resources.form.title')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <Select
          id="doc-kind"
          label={t('resources.proposed.filterKind')}
          value={kind}
          onChange={(event) => setKind(event.target.value as DocumentDraft['kind'])}
        >
          {KINDS.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.kind.${id}` as MessageKey)}
            </option>
          ))}
        </Select>
        {!studentMode && !initial ? (
          <Select
            id="doc-audience"
            label={t('resources.proposed.access')}
            value={audience}
            onChange={(event) => setAudience(event.target.value as 'ALL' | 'ONE')}
          >
            <option value="ALL">{t('resources.proposed.shareAll')}</option>
            <option value="ONE">{t('resources.proposed.shareOne')}</option>
          </Select>
        ) : null}
        {!studentMode && !initial && audience === 'ONE' ? (
          <Select
            id="doc-student"
            label={t('resources.proposed.student')}
            value={targetThesis}
            onChange={(event) => setTargetThesis(event.target.value)}
          >
            {theses.map((thesis) => (
              <option key={thesis.thesisId} value={thesis.thesisId}>
                {thesis.label}
              </option>
            ))}
          </Select>
        ) : null}
        {!studentMode && (initial || audience === 'ONE') ? (
          <Select
            id="doc-access"
            label={t('resources.proposed.access')}
            value={access}
            onChange={(event) => setAccess(event.target.value as DocumentDraft['access'])}
          >
            <option value="SHARED">{t('resources.proposed.accessLevel.SHARED')}</option>
            <option value="PROTECTED">{t('resources.proposed.accessLevel.PROTECTED')}</option>
          </Select>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="doc-url"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted"
          >
            <Icon name="library" className="h-4 w-4 text-brand" />
            {t('resources.proposed.url')}
          </label>
          <input
            id="doc-url"
            type="url"
            value={url}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-control outline-none placeholder:text-muted/70 focus:border-brand"
          />
        </div>
        <p className="text-xs text-muted">{t('resources.proposed.linkOrFile')}</p>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Icon name="download" className="h-4 w-4 text-brand" />
            {t('resources.proposed.file')}
          </span>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block text-sm"
          />
        </div>
        {actions.create.error || actions.update.error || share.error ? (
          <p className="text-sm text-danger">
            {queryErrorMessage(share.error ?? actions.update.error ?? actions.create.error, t)}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={actions.create.isPending || actions.update.isPending || share.isPending}
          >
            {t('common.save')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-0 sm:flex-row sm:items-center sm:gap-2 sm:px-3 sm:first:pl-0 sm:last:pr-0">
      <dt className="truncate text-[10px] leading-4 text-muted sm:text-[11px]" title={label}>
        {label}
      </dt>
      <dd className="text-sm leading-5 font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
