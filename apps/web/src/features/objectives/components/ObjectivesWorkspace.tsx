import { Button, EmptyState, Modal, Skeleton } from '@thesispartner/ui';
import { IconAction } from '../../../components/IconAction';
import { useState } from 'react';
import { useT } from '../../../i18n/LocaleContext';
import { filtersFromTab } from '../keys';
import type { StatusTab } from '../labels';
import {
  useApplyStandardPath,
  useCreateObjective,
  useDeleteObjective,
  useObjectives,
  useStandardPath,
  useUpdateListedObjective,
  type Objective,
} from '../hooks/use-objectives';
import { ObjectiveFilters } from './ObjectiveFilters';
import { ObjectiveForm } from './ObjectiveForm';
import { ObjectiveList } from './ObjectiveList';
import { QueryError, queryErrorMessage } from './QueryError';

export function ObjectivesWorkspace({
  thesisId,
  canManage,
  detailPath,
  tabsAside: _tabsAside = false,
  canRemark = false,
}: {
  thesisId: string;
  canManage: boolean;
  detailPath: (objectiveId: string) => string;
  tabsAside?: boolean;
  canRemark?: boolean;
}) {
  void _tabsAside;
  const t = useT();
  const [tab, setTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Objective | null>(null);
  const filters = filtersFromTab(tab, search);
  const objectives = useObjectives(thesisId, filters);
  const standardPath = useStandardPath(canManage ? thesisId : null);
  const applyPath = useApplyStandardPath(thesisId);
  const create = useCreateObjective(thesisId);
  const update = useUpdateListedObjective(thesisId);
  const remove = useDeleteObjective(thesisId);
  const filtered = tab !== 'all' || search.trim().length > 0;

  const showCreate = canManage && (objectives.data?.objectives.length ?? 0) > 0;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <ObjectiveFilters
            tab={tab}
            search={search}
            onTab={setTab}
            onSearch={setSearch}
            part="tabs"
          />
        </div>
        {showCreate ? (
          <IconAction
            className="shrink-0"
            label={t('objectives.new')}
            icon="plus"
            onClick={() => setCreating(true)}
          />
        ) : null}
      </div>
      <div>
        <ObjectiveFilters
          tab={tab}
          search={search}
          onTab={setTab}
          onSearch={setSearch}
          part="search"
        />
        {canManage && standardPath.data && !standardPath.data.applied ? (
          <div className="mt-4">
            <Button
              variant="secondary"
              disabled={applyPath.isPending}
              onClick={() => void applyPath.mutate()}
            >
              {t('objectives.applyStandardPath')}
            </Button>
          </div>
        ) : null}
        {objectives.isLoading ? (
          <div className="mt-4 flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : null}
        {objectives.isError ? <QueryError error={objectives.error} /> : null}
        {objectives.data && objectives.data.objectives.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={t('objectives.emptyTitle')}
              description={t('objectives.emptyDescription')}
            />
            {canManage && !filtered ? (
              <IconAction
                className="mt-4"
                label={t('objectives.new')}
                icon="plus"
                onClick={() => setCreating(true)}
              />
            ) : null}
          </div>
        ) : null}
        {objectives.data && objectives.data.objectives.length > 0 ? (
          <ObjectiveList
            objectives={objectives.data.objectives}
            detailPath={detailPath}
            thesisId={thesisId}
            canManage={canManage}
            canRemark={canRemark}
            onEdit={setEditing}
            onDelete={setPendingDelete}
          />
        ) : null}
        <Modal
          open={creating}
          title={t('objectives.new')}
          closeLabel={t('common.close')}
          onClose={() => setCreating(false)}
        >
          <ObjectiveForm
            submitLabel={t('objectives.form.create')}
            pending={create.isPending}
            error={create.error}
            onSubmit={async (body) => {
              await create.mutateAsync(body);
              setCreating(false);
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
        <Modal
          open={editing !== null}
          title={t('objectives.edit')}
          closeLabel={t('common.close')}
          onClose={() => setEditing(null)}
        >
          {editing ? (
            <ObjectiveForm
              initial={editing}
              progressLocked={editing.progressMode === 'TASK_BASED'}
              submitLabel={t('objectives.form.save')}
              pending={update.isPending}
              error={update.error}
              onSubmit={async (body) => {
                const next =
                  editing.progressMode === 'TASK_BASED' ? { ...body, progress: undefined } : body;
                await update.mutateAsync({ objectiveId: editing.id, body: next });
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </Modal>
        <Modal
          open={pendingDelete !== null}
          title={t('objectives.delete')}
          closeLabel={t('common.close')}
          onClose={() => setPendingDelete(null)}
        >
          {pendingDelete ? (
            <div>
              <p className="text-sm text-ink">{t('objectives.deleteConfirm')}</p>
              {remove.error ? (
                <p className="mt-3 text-sm text-danger" role="alert">
                  {queryErrorMessage(remove.error, t)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={remove.isPending}
                  onClick={() => {
                    void remove.mutateAsync(pendingDelete.id).then(() => setPendingDelete(null));
                  }}
                >
                  {t('objectives.confirmDelete')}
                </Button>
                <Button variant="secondary" onClick={() => setPendingDelete(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
