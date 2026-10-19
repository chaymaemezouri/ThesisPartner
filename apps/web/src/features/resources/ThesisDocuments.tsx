import { Button, Input, Modal, Select, Textarea } from '@thesispartner/ui';
import { useState, type ReactNode } from 'react';
import { useT } from '../../i18n/LocaleContext';
import type { MessageKey } from '../../i18n/translate';
import { useDashboard } from '../dashboard/hooks/use-dashboard';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import { useSupervisedTheses } from '../supervision/hooks/use-supervised-theses';
import {
  useThesisDocumentActions,
  useThesisDocuments,
  type DocumentDraft,
  type ThesisDocument,
} from './hooks/use-thesis-documents';

const KINDS = ['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'REPORT', 'REFERENCE', 'LINK'] as const;
const IMPORTANCE = ['LOW', 'MEDIUM', 'HIGH', 'ESSENTIAL'] as const;
const PRIORITY = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
const EDITABLE = new Set(['TO_READ', 'READ', 'SYNTHESIS_DRAFT', 'CHANGES_REQUESTED']);

export function ThesisDocuments({ canManage }: { canManage: boolean }) {
  const t = useT();
  const supervised = useSupervisedTheses();
  const dashboard = useDashboard();
  const theses = supervised.data?.theses ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const thesisId = canManage
    ? (picked ?? theses[0]?.thesisId ?? null)
    : (dashboard.data?.thesis?.id ?? null);
  const desk = useThesisDocuments(thesisId);
  const [kind, setKind] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [importance, setImportance] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [objectiveId, setObjectiveId] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ThesisDocument | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const documents = (desk.data?.documents ?? []).filter((item) => {
    if (kind !== 'ALL' && item.kind !== kind) return false;
    if (status !== 'ALL' && item.status !== status) return false;
    if (importance !== 'ALL' && item.importance !== importance) return false;
    if (priority !== 'ALL' && item.priority !== priority) return false;
    if (objectiveId === 'NONE' && item.objectiveId) return false;
    if (objectiveId !== 'ALL' && objectiveId !== 'NONE' && item.objectiveId !== objectiveId)
      return false;
    return true;
  });
  const summary = desk.data?.summary;

  return (
    <div>
      {canManage && theses.length > 1 ? (
        <label className="mb-3 block text-sm text-ink">
          {t('resources.proposed.student')}
          <select
            className="mt-1 block rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
            value={thesisId ?? ''}
            onChange={(event) => setPicked(event.target.value)}
          >
            {theses.map((thesis) => (
              <option key={thesis.thesisId} value={thesis.thesisId}>
                {thesis.doctoralStudent
                  ? `${thesis.doctoralStudent.givenName} ${thesis.doctoralStudent.familyName}`
                  : thesis.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {summary ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label={t('resources.proposed.proposedCount')} value={summary.proposed} />
          <Stat label={t('resources.proposed.consultedCount')} value={summary.consulted} />
          <Stat label={t('resources.proposed.draftCount')} value={summary.drafts} />
          <Stat label={t('resources.proposed.submittedCount')} value={summary.submitted} />
          <Stat label={t('resources.proposed.validatedCount')} value={summary.validated} />
          <Stat label={t('resources.proposed.priorityCount')} value={summary.priorityOpen} />
          <Stat label={t('resources.proposed.overdueCount')} value={summary.overdue} />
        </div>
      ) : null}
      {desk.data ? (
        <p className="mb-3 text-xs text-muted">
          {t('resources.proposed.byObjective')}
          {' · '}
          {groupByObjective(desk.data.documents, t('resources.proposed.unassigned'))
            .map((item) => `${item.title} ${item.count}`)
            .join(' · ') || t('resources.proposed.empty')}
        </p>
      ) : null}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Filter label={t('resources.proposed.filterKind')} value={kind} onChange={setKind}>
          <option value="ALL">{t('resources.proposed.filterAll')}</option>
          {KINDS.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.kind.${id}` as MessageKey)}
            </option>
          ))}
        </Filter>
        <Filter label={t('resources.proposed.filterStatus')} value={status} onChange={setStatus}>
          <option value="ALL">{t('resources.proposed.filterAll')}</option>
          {(
            [
              'TO_READ',
              'READ',
              'SYNTHESIS_DRAFT',
              'SUBMITTED',
              'CHANGES_REQUESTED',
              'VALIDATED',
            ] as const
          ).map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.status.${id}` as MessageKey)}
            </option>
          ))}
        </Filter>
        <Filter
          label={t('resources.proposed.importance')}
          value={importance}
          onChange={setImportance}
        >
          <option value="ALL">{t('resources.proposed.filterAll')}</option>
          {IMPORTANCE.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.importanceLevel.${id}` as MessageKey)}
            </option>
          ))}
        </Filter>
        <Filter label={t('resources.proposed.priority')} value={priority} onChange={setPriority}>
          <option value="ALL">{t('resources.proposed.filterAll')}</option>
          {PRIORITY.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.priorityLevel.${id}` as MessageKey)}
            </option>
          ))}
        </Filter>
        <Filter
          label={t('resources.proposed.objective')}
          value={objectiveId}
          onChange={setObjectiveId}
        >
          <option value="ALL">{t('resources.proposed.filterAll')}</option>
          <option value="NONE">{t('resources.proposed.unassigned')}</option>
          {(desk.data?.objectives ?? []).map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.title}
            </option>
          ))}
        </Filter>
        {canManage && thesisId ? (
          <Button onClick={() => setCreating(true)}>{t('resources.proposed.add')}</Button>
        ) : null}
      </div>
      {desk.isError ? <QueryError error={desk.error} /> : null}
      {desk.data && documents.length === 0 ? (
        <p className="text-sm text-muted">{t('resources.proposed.empty')}</p>
      ) : null}
      <ul className="grid gap-2">
        {thesisId
          ? documents.map((item) => (
              <DocumentRow
                key={item.id}
                thesisId={thesisId}
                item={item}
                canManage={canManage}
                open={openId === item.id}
                objectives={desk.data?.objectives ?? []}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                onEdit={() => setEditing(item)}
              />
            ))
          : null}
      </ul>
      {thesisId ? (
        <DocumentForm
          key={editing?.id ?? 'new'}
          open={creating || editing !== null}
          thesisId={thesisId}
          objectives={desk.data?.objectives ?? []}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DocumentRow({
  thesisId,
  item,
  canManage,
  open,
  objectives,
  onToggle,
  onEdit,
}: {
  thesisId: string;
  item: ThesisDocument;
  canManage: boolean;
  open: boolean;
  objectives: DocumentDeskObjectives;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  return (
    <li className="rounded-md border border-line bg-surface px-3 py-2">
      <button type="button" className="flex w-full items-center gap-2 text-left" onClick={onToggle}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{item.title}</span>
          <span className="mt-0.5 block text-xs text-muted">
            {t(`resources.proposed.kind.${item.kind}` as MessageKey)}
            {item.authors ? ` · ${item.authors}` : ''}
            {item.objectiveTitle ? ` · ${item.objectiveTitle}` : ''}
            {item.stepTitle ? ` · ${item.stepTitle}` : ''}
            {item.dueDate ? ` · ${item.dueDate}` : ''}
            {item.overdue ? ` · ${t('resources.proposed.overdueCount')}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-medium text-brand">
          {t(`resources.proposed.status.${item.status}` as MessageKey)}
        </span>
        <span className="shrink-0 text-[11px] text-muted">
          {t(`resources.proposed.priorityLevel.${item.priority}` as MessageKey)}
        </span>
      </button>
      {open ? (
        <div className="mt-3 border-t border-line pt-3">
          {item.reference ? <p className="text-sm text-ink">{item.reference}</p> : null}
          {item.instructions ? (
            <p className="mt-1 text-sm text-muted">{item.instructions}</p>
          ) : null}
          {item.access === 'PROTECTED' && !canManage ? (
            <div className="mt-2">
              <p className="text-sm text-warn">{t('resources.proposed.protected')}</p>
              {item.status === 'TO_READ' ? (
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
              {item.url ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!canManage) void actions.consult.mutate(item.id);
                    window.open(item.url!, '_blank', 'noopener');
                  }}
                >
                  {t('resources.proposed.open')}
                </Button>
              ) : null}
              {item.fileName ? (
                <>
                  <Button variant="secondary" onClick={() => void actions.openFile(item.id, true)}>
                    {item.fileName}
                  </Button>
                  <Button variant="secondary" onClick={() => void actions.openFile(item.id, false)}>
                    {t('resources.proposed.download')}
                  </Button>
                </>
              ) : null}
              {!canManage && item.status === 'TO_READ' && !item.url && !item.fileName ? (
                <Button variant="secondary" onClick={() => actions.consult.mutate(item.id)}>
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
            <SynthesisRead item={item} />
          ) : null}
          {canManage && item.status === 'SUBMITTED' ? (
            <ReviewForm thesisId={thesisId} documentId={item.id} />
          ) : null}
          {canManage && item.status !== 'SUBMITTED' ? <SynthesisRead item={item} /> : null}
          {canManage ? (
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
    </li>
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
  const steps = objectives.find((objective) => objective.id === objectiveId)?.steps ?? [];
  const body = {
    summary,
    methodology,
    results,
    limits,
    thesisLink,
    exploitation,
    objectiveId,
    taskId,
  };
  return (
    <form className="mt-3 grid gap-2" onSubmit={(event) => event.preventDefault()}>
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
        onChange={(event) => setTaskId(event.target.value)}
      >
        <option value="">{t('resources.proposed.none')}</option>
        {steps.map((step) => (
          <option key={step.id} value={step.id}>
            {step.title}
          </option>
        ))}
      </Select>
      <Textarea
        id={`sum-${item.id}`}
        label={t('resources.proposed.summary')}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />
      <Textarea
        id={`met-${item.id}`}
        label={t('resources.proposed.methodology')}
        value={methodology}
        onChange={(event) => setMethodology(event.target.value)}
      />
      <Textarea
        id={`res-${item.id}`}
        label={t('resources.proposed.results')}
        value={results}
        onChange={(event) => setResults(event.target.value)}
      />
      <Textarea
        id={`lim-${item.id}`}
        label={t('resources.proposed.limits')}
        value={limits}
        onChange={(event) => setLimits(event.target.value)}
      />
      <Textarea
        id={`link-${item.id}`}
        label={t('resources.proposed.thesisLink')}
        value={thesisLink}
        onChange={(event) => setThesisLink(event.target.value)}
      />
      <Textarea
        id={`use-${item.id}`}
        label={t('resources.proposed.exploitation')}
        value={exploitation}
        onChange={(event) => setExploitation(event.target.value)}
      />
      {actions.synthesis.error ? (
        <p className="text-sm text-danger">{queryErrorMessage(actions.synthesis.error, t)}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={actions.synthesis.isPending}
          onClick={() => actions.synthesis.mutate({ id: item.id, body })}
        >
          {t('resources.proposed.saveDraft')}
        </Button>
        <Button
          disabled={actions.synthesis.isPending}
          onClick={() => actions.synthesis.mutate({ id: item.id, body: { ...body, submit: true } })}
        >
          {t('resources.proposed.submit')}
        </Button>
      </div>
    </form>
  );
}

function SynthesisRead({ item }: { item: ThesisDocument }) {
  const t = useT();
  const fields = [
    [t('resources.proposed.summary'), item.summary],
    [t('resources.proposed.methodology'), item.methodology],
    [t('resources.proposed.results'), item.results],
    [t('resources.proposed.limits'), item.limits],
    [t('resources.proposed.thesisLink'), item.thesisLink],
    [t('resources.proposed.exploitation'), item.exploitation],
  ] as const;
  if (fields.every((field) => !field[1])) return null;
  return (
    <div className="mt-3 grid gap-2">
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

function ReviewForm({ thesisId, documentId }: { thesisId: string; documentId: string }) {
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
          onClick={() => actions.review.mutate({ id: documentId, decision: 'VALIDATED', message })}
        >
          {t('resources.proposed.validate')}
        </Button>
        <Button
          variant="secondary"
          disabled={actions.review.isPending || message.trim().length === 0}
          onClick={() =>
            actions.review.mutate({ id: documentId, decision: 'CHANGES_REQUESTED', message })
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
  objectives,
  initial,
  onClose,
}: {
  open: boolean;
  thesisId: string;
  objectives: DocumentDeskObjectives;
  initial: ThesisDocument | null;
  onClose: () => void;
}) {
  const t = useT();
  const actions = useThesisDocumentActions(thesisId);
  const known = useThesisDocuments(thesisId);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<DocumentDraft['kind']>(initial?.kind ?? 'ARTICLE');
  const [authors, setAuthors] = useState(initial?.authors ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [objectiveId, setObjectiveId] = useState(initial?.objectiveId ?? '');
  const [taskId, setTaskId] = useState(initial?.taskId ?? '');
  const [importance, setImportance] = useState<DocumentDraft['importance']>(
    initial?.importance ?? 'MEDIUM',
  );
  const [priority, setPriority] = useState<DocumentDraft['priority']>(
    initial?.priority ?? 'NORMAL',
  );
  const [access, setAccess] = useState<DocumentDraft['access']>(initial?.access ?? 'SHARED');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [file, setFile] = useState<File | null>(null);
  const steps = objectives.find((objective) => objective.id === objectiveId)?.steps ?? [];
  return (
    <Modal
      open={open}
      title={initial ? t('resources.edit') : t('resources.proposed.add')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const before = new Set((known.data?.documents ?? []).map((item) => item.id));
          const body: DocumentDraft = {
            title,
            kind,
            authors,
            reference,
            url,
            objectiveId,
            taskId,
            importance,
            priority,
            access,
            dueDate,
            instructions,
          };
          const saved = initial
            ? actions.update.mutateAsync({ id: initial.id, body })
            : actions.create.mutateAsync(body);
          void saved.then(async (desk) => {
            const created = initial
              ? desk.documents.find((item) => item.id === initial.id)
              : desk.documents.find((item) => !before.has(item.id));
            if (file && created) await actions.upload.mutateAsync({ id: created.id, file });
            onClose();
          });
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
        <Input
          id="doc-authors"
          label={t('resources.proposed.authors')}
          value={authors}
          onChange={(event) => setAuthors(event.target.value)}
        />
        <Textarea
          id="doc-reference"
          label={t('resources.proposed.reference')}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <Input
          id="doc-url"
          label={t('resources.proposed.url')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Select
          id="doc-objective"
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
          id="doc-step"
          label={t('resources.proposed.step')}
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
        >
          <option value="">{t('resources.proposed.none')}</option>
          {steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.title}
            </option>
          ))}
        </Select>
        <Select
          id="doc-importance"
          label={t('resources.proposed.importance')}
          value={importance}
          onChange={(event) => setImportance(event.target.value as DocumentDraft['importance'])}
        >
          {IMPORTANCE.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.importanceLevel.${id}` as MessageKey)}
            </option>
          ))}
        </Select>
        <Select
          id="doc-priority"
          label={t('resources.proposed.priority')}
          value={priority}
          onChange={(event) => setPriority(event.target.value as DocumentDraft['priority'])}
        >
          {PRIORITY.map((id) => (
            <option key={id} value={id}>
              {t(`resources.proposed.priorityLevel.${id}` as MessageKey)}
            </option>
          ))}
        </Select>
        <Select
          id="doc-access"
          label={t('resources.proposed.access')}
          value={access}
          onChange={(event) => setAccess(event.target.value as DocumentDraft['access'])}
        >
          <option value="SHARED">{t('resources.proposed.accessLevel.SHARED')}</option>
          <option value="PROTECTED">{t('resources.proposed.accessLevel.PROTECTED')}</option>
        </Select>
        <Input
          id="doc-due"
          label={t('resources.proposed.due')}
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
        <Textarea
          id="doc-instructions"
          label={t('resources.proposed.instructions')}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
        <label className="text-sm text-ink">
          {t('resources.proposed.file')}
          <input
            className="mt-1 block text-sm"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {actions.create.error || actions.update.error ? (
          <p className="text-sm text-danger">
            {queryErrorMessage(actions.update.error ?? actions.create.error, t)}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={actions.create.isPending || actions.update.isPending}>
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

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <select
        className="mt-1 block rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function groupByObjective(documents: ThesisDocument[], unassigned: string) {
  const counts = new Map<string, { title: string; count: number }>();
  for (const item of documents) {
    const id = item.objectiveId ?? 'none';
    const current = counts.get(id) ?? { title: item.objectiveTitle ?? unassigned, count: 0 };
    current.count += 1;
    counts.set(id, current);
  }
  return [...counts.values()];
}
