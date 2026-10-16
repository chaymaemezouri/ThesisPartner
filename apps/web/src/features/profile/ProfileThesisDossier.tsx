import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createThesisSchema,
  thesisDetailSchema,
  thesisListSchema,
  thesisSummarySchema,
} from '@thesispartner/validation';

import { useState } from 'react';

import { z } from 'zod';

import { Button, Input, Modal } from '@thesispartner/ui';

import { apiGet, apiSend } from '../../api/client';

import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';

import { useZodForm } from '../../forms/use-zod-form';

import { useT } from '../../i18n/LocaleContext';

import { InviteForm, ThesisEditForm } from '../theses/ThesisForms';

import { primaryThesis } from '../theses/primary-thesis';

const deletedSchema = z.object({ id: z.string().uuid() });

export function ProfileThesisDossier() {
  const t = useT();

  const list = useQuery({
    queryKey: ['theses'],

    queryFn: () => apiGet('/api/v1/theses', thesisListSchema),
  });

  const thesis = list.data ? primaryThesis(list.data.theses) : null;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-ink">{t('profile.thesis')}</h2>

      {list.isLoading ? <p className="mt-2 text-sm text-muted">{t('common.loading')}</p> : null}

      {list.isError ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {formErrorMessage(list.error, t)}
        </p>
      ) : null}

      {list.data && !thesis ? <CreateThesis /> : null}

      {thesis ? (
        <Dossier thesisId={thesis.id} canDelete={thesis.role === 'DOCTORAL_STUDENT'} />
      ) : null}
    </section>
  );
}

function CreateThesis() {
  const t = useT();

  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);

  const form = useZodForm(createThesisSchema, { defaultValues: { title: '' } });

  const mutation = useMutation({
    mutationFn: (title: string) => apiSend('/api/v1/theses', thesisSummarySchema, { title }),

    onSuccess: async () => {
      form.reset();

      await queryClient.invalidateQueries({ queryKey: ['theses'] });

      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] sm:flex-row sm:items-end"

      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);

        try {
          await mutation.mutateAsync(values.title);
        } catch (error) {
          applyFieldErrors(error, form.setError);

          setMessage(formErrorMessage(error, t));
        }
      })}
    >
      <div className="min-w-0 flex-1">
        <Input
          id="profile-thesis-title"

          label={t('profile.thesisTitle')}

          error={form.formState.errors.title?.message}

          {...form.register('title')}
        />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {t('profile.add')}
      </Button>

      {message ? (
        <p className="text-sm text-danger sm:basis-full" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Dossier({ thesisId, canDelete }: { thesisId: string; canDelete: boolean }) {
  const t = useT();

  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const detail = useQuery({
    queryKey: ['theses', thesisId],

    queryFn: () => apiGet(`/api/v1/theses/${thesisId}`, thesisDetailSchema),
  });

  const remove = useMutation({
    mutationFn: () => apiSend(`/api/v1/theses/${thesisId}`, deletedSchema, {}, 'DELETE'),

    onSuccess: async () => {
      setConfirmDelete(false);

      await queryClient.invalidateQueries({ queryKey: ['theses'] });

      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      await queryClient.invalidateQueries({ queryKey: ['supervision'] });
    },
  });

  if (detail.isLoading)
    return <p className="mt-2 text-sm text-muted">{t('profile.loadingDossier')}</p>;

  if (detail.isError || !detail.data) {
    return (
      <p className="mt-2 text-sm text-danger" role="alert">
        {formErrorMessage(detail.error, t)}
      </p>
    );
  }

  const thesis = detail.data;

  const supervisor = thesis.members.find((member) => member.role === 'SUPERVISOR');

  const canEdit = thesis.role === 'DOCTORAL_STUDENT' || thesis.role === 'SUPERVISOR';

  return (
    <article className="mt-4 rounded-2xl border border-line bg-gradient-to-r from-teal-soft/80 via-surface to-brand-soft p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">{thesis.title}</h3>

          <p className="mt-1 truncate text-sm text-muted">
            {t('profile.supervisorLabel')} ·{' '}
            {supervisor?.email ? (
              <a
                className="font-medium text-brand hover:underline"
                href={`mailto:${supervisor.email}`}
              >
                {supervisor.email}
              </a>
            ) : (
              <span className="text-ink">{t('profile.noSupervisor')}</span>
            )}
          </p>
        </div>

        {canEdit ? (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>

            {canDelete ? (
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {canEdit ? <InviteForm thesisId={thesis.id} /> : null}

      <Modal
        open={editing}
        title={t('profile.editThesis')}
        closeLabel={t('common.close')}
        onClose={() => setEditing(false)}
      >
        <ThesisEditForm thesisId={thesis.id} initial={thesis} onSaved={() => setEditing(false)} />
      </Modal>

      <Modal
        open={confirmDelete}
        title={t('profile.deleteThesis')}
        closeLabel={t('common.close')}
        onClose={() => setConfirmDelete(false)}
      >
        <p className="text-sm text-ink">
          {t('profile.deleteThesisConfirm', { title: thesis.title })}
        </p>

        {remove.error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {formErrorMessage(remove.error, t)}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={remove.isPending}
            onClick={() => void remove.mutateAsync()}
          >
            {t('common.delete')}
          </Button>

          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </article>
  );
}
