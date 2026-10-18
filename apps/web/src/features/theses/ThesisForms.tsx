import { useQueryClient } from '@tanstack/react-query';

import {
  inviteMemberSchema,
  inviteResponseSchema,
  thesisDetailSchema,
  updateThesisSchema,
} from '@thesispartner/validation';

import { useState } from 'react';

import { Button, Input, Select } from '@thesispartner/ui';

import { apiSend } from '../../api/client';

import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';

import { useZodForm } from '../../forms/use-zod-form';

import { useT } from '../../i18n/LocaleContext';

export const ROLE_LABEL = {
  DOCTORAL_STUDENT: 'Doctoral student',

  SUPERVISOR: 'Supervisor',

  ADMIN: 'Administration',
} as const;

export function ThesisEditForm({
  thesisId,

  initial,

  onSaved,
}: {
  thesisId: string;

  initial: {
    title: string;

    discipline: string | null;

    institution: string | null;

    startedOn: string | null;

    expectedDefenseOn: string | null;
  };

  onSaved: () => void;
}) {
  const t = useT();

  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);

  const form = useZodForm(updateThesisSchema, {
    defaultValues: {
      title: initial.title,

      discipline: initial.discipline ?? '',

      institution: initial.institution ?? '',

      startedOn: initial.startedOn ?? '',

      expectedDefenseOn: initial.expectedDefenseOn ?? '',
    },
  });

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"

      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);

        try {
          await apiSend(`/api/v1/theses/${thesisId}`, thesisDetailSchema, values, 'PATCH');

          await queryClient.invalidateQueries({ queryKey: ['theses'] });

          await queryClient.invalidateQueries({ queryKey: ['thesis'] });

          await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          onSaved();
        } catch (error) {
          applyFieldErrors(error, form.setError);

          setMessage(formErrorMessage(error, t));
        }
      })}
    >
      <div className="sm:col-span-2">
        <Input
          id={`edit-title-${thesisId}`}

          label={t('thesis.title')}

          error={form.formState.errors.title?.message}

          {...form.register('title')}
        />
      </div>

      <Input
        id={`edit-discipline-${thesisId}`}
        label={t('thesis.discipline')}
        {...form.register('discipline')}
      />

      <Input
        id={`edit-institution-${thesisId}`}

        label={t('thesis.institution')}

        {...form.register('institution')}
      />

      <Input
        id={`edit-started-${thesisId}`}

        label={t('thesis.startDate')}

        type="date"

        {...form.register('startedOn')}
      />

      <Input
        id={`edit-defense-${thesisId}`}

        label={t('thesis.expectedDefense')}

        type="date"

        {...form.register('expectedDefenseOn')}
      />

      {message ? (
        <p className="text-sm text-danger sm:col-span-2" role="alert">
          {message}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  );
}

export function ThesisDetailsForm({
  thesisId,

  initial,

  stacked = false,
}: {
  thesisId: string;

  initial: {
    discipline: string | null;

    institution: string | null;

    startedOn: string | null;

    expectedDefenseOn: string | null;
  };

  stacked?: boolean;
}) {
  const t = useT();

  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);

  const form = useZodForm(updateThesisSchema, {
    defaultValues: {
      discipline: initial.discipline ?? '',

      institution: initial.institution ?? '',

      startedOn: initial.startedOn ?? '',

      expectedDefenseOn: initial.expectedDefenseOn ?? '',
    },
  });

  return (
    <form
      className={
        stacked
          ? 'mt-4 grid gap-3 border-t border-line pt-4'
          : 'mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2'
      }

      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);

        try {
          await apiSend(`/api/v1/theses/${thesisId}`, thesisDetailSchema, values, 'PATCH');

          await queryClient.invalidateQueries({ queryKey: ['theses'] });

          await queryClient.invalidateQueries({ queryKey: ['thesis'] });

          await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        } catch (error) {
          applyFieldErrors(error, form.setError);

          setMessage(formErrorMessage(error, t));
        }
      })}
    >
      <Input
        id={`discipline-${thesisId}`}

        label={t('thesis.discipline')}

        hint={t('thesis.optional')}

        {...form.register('discipline')}
      />

      <Input
        id={`institution-${thesisId}`}

        label={t('thesis.institution')}

        hint={t('thesis.optional')}

        {...form.register('institution')}
      />

      <Input
        id={`started-${thesisId}`}

        label={t('thesis.startDate')}

        type="date"

        {...form.register('startedOn')}
      />

      <Input
        id={`defense-${thesisId}`}

        label={t('thesis.expectedDefense')}

        type="date"

        {...form.register('expectedDefenseOn')}
      />

      {message ? (
        <p className="text-sm text-danger sm:col-span-2" role="alert">
          {message}
        </p>
      ) : null}

      <div>
        <Button type="submit">{t('profile.saveThesis')}</Button>
      </div>
    </form>
  );
}

export function InviteForm({ thesisId, stacked = false }: { thesisId: string; stacked?: boolean }) {
  const t = useT();

  const queryClient = useQueryClient();

  const [message, setMessage] = useState<string | null>(null);

  const form = useZodForm(inviteMemberSchema, {
    defaultValues: { email: '', role: 'SUPERVISOR' },
  });

  return (
    <form
      className={
        stacked
          ? 'mt-4 grid gap-3 border-t border-line pt-4'
          : 'mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_12rem_auto]'
      }

      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);

        try {
          await apiSend(`/api/v1/theses/${thesisId}/members`, inviteResponseSchema, values);

          form.reset({ email: '', role: 'SUPERVISOR' });

          await queryClient.invalidateQueries({ queryKey: ['theses', thesisId] });

          await queryClient.invalidateQueries({ queryKey: ['thesis', thesisId] });
        } catch (error) {
          applyFieldErrors(error, form.setError);

          setMessage(formErrorMessage(error, t));
        }
      })}
    >
      <Input
        id={`invite-email-${thesisId}`}

        label={t('thesis.memberEmail')}

        type="email"

        error={form.formState.errors.email?.message}

        {...form.register('email')}
      />

      <Select id={`invite-role-${thesisId}`} label={t('thesis.role')} {...form.register('role')}>
        <option value="SUPERVISOR">{t('thesis.roles.SUPERVISOR')}</option>

        <option value="DOCTORAL_STUDENT">{t('thesis.roles.DOCTORAL_STUDENT')}</option>

        <option value="ADMIN">{t('thesis.roles.ADMIN')}</option>
      </Select>

      <div className="sm:self-end">
        <Button type="submit">{t('profile.invite')}</Button>
      </div>

      {message ? (
        <p className="text-sm text-danger sm:col-span-3" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
