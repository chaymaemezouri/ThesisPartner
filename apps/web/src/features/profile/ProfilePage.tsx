import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  academicProfileSchema,
  fileDownloadSchema,
  updateProfileSchema,
} from '@thesispartner/validation';
import { useRef, useState } from 'react';
import type { z } from 'zod';
import { Avatar, Button, Input } from '@thesispartner/ui';
import { ApiClientError, apiGet, apiSend, apiUpload } from '../../api/client';
import { applyFieldErrors, formErrorMessage } from '../../forms/api-errors';
import { useZodForm } from '../../forms/use-zod-form';
import { useT } from '../../i18n/LocaleContext';
import { ProfileThesisDossier } from './ProfileThesisDossier';

export function ProfilePage() {
  const t = useT();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiGet('/api/v1/profile', academicProfileSchema),
  });

  if (profile.isLoading) return <p className="text-sm text-muted">{t('common.loading')}</p>;
  if (profile.isError || !profile.data) {
    return (
      <p className="text-sm text-danger" role="alert">
        {formErrorMessage(profile.error, t)}
      </p>
    );
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-3">
        <h1 className="font-serif text-2xl text-ink">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('profile.subtitle')}</p>
      </header>
      <ProfileForm
        initial={profile.data}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['profile'] });
          await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          await queryClient.invalidateQueries({ queryKey: ['me'] });
        }}
      />
      <ProfileThesisDossier />
    </div>
  );
}

function ProfileForm({
  initial,
  onSaved,
}: {
  initial: z.infer<typeof academicProfileSchema>;
  onSaved: () => Promise<void>;
}) {
  const t = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [avatarCacheBust, setAvatarCacheBust] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cvInput = useRef<HTMLInputElement>(null);
  const form = useZodForm(updateProfileSchema, {
    defaultValues: {
      givenName: initial.givenName,
      familyName: initial.familyName,
      academicTitle: initial.academicTitle ?? '',
      institution: initial.institution ?? '',
      laboratory: initial.laboratory ?? '',
      doctoralSchool: initial.doctoralSchool ?? '',
      specialty: initial.specialty ?? '',
      city: initial.city ?? '',
      country: initial.country ?? '',
      orcid: initial.orcid ?? '',
      googleScholarUrl: initial.googleScholarUrl ?? '',
      linkedinUrl: initial.linkedinUrl ?? '',
    },
  });
  const displayName = `${initial.givenName} ${initial.familyName}`.trim();
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof updateProfileSchema>) =>
      apiSend('/api/v1/profile', academicProfileSchema, values, 'PATCH'),
  });
  const hasUploadedCv = initial.cvUrl === '/api/v1/profile/cv/download';
  const avatarSrc =
    initial.avatarUrl && initial.avatarUrl.startsWith('/api/')
      ? `${initial.avatarUrl}${avatarCacheBust ? `?t=${avatarCacheBust}` : ''}`
      : initial.avatarUrl;

  async function uploadAsset(kind: 'avatar' | 'cv', file: File | undefined) {
    if (!file) return;
    const localError = kind === 'avatar' ? localAvatarError(file, t) : localCvError(file, t);
    if (localError) {
      setAssetSuccess(false);
      setAssetMessage(localError);
      return;
    }
    setAssetMessage(null);
    setAssetSuccess(false);
    if (kind === 'avatar') setAvatarBusy(true);
    else setCvBusy(true);
    try {
      await apiUpload(
        kind === 'avatar' ? '/api/v1/profile/avatar' : '/api/v1/profile/cv',
        academicProfileSchema,
        file,
      );
      if (kind === 'avatar') setAvatarCacheBust(Date.now());
      await onSaved();
      setAssetSuccess(true);
      setAssetMessage(kind === 'avatar' ? t('profile.photoSaved') : t('profile.cvSaved'));
    } catch (error) {
      setAssetSuccess(false);
      setAssetMessage(assetErrorMessage(error, t));
    } finally {
      if (kind === 'avatar') setAvatarBusy(false);
      else setCvBusy(false);
    }
  }

  async function openCv() {
    setAssetMessage(null);
    setAssetSuccess(false);
    try {
      const signed = await apiGet('/api/v1/profile/cv/download', fileDownloadSchema);
      window.open(signed.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setAssetMessage(assetErrorMessage(error, t));
    }
  }

  return (
    <form
      className="rounded-2xl border border-line bg-gradient-to-br from-brand-soft/70 via-surface to-surface p-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
      onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        setSaved(false);
        try {
          await mutation.mutateAsync(values);
          setSaved(true);
          await onSaved();
        } catch (error) {
          applyFieldErrors(error, form.setError);
          setMessage(formErrorMessage(error, t));
        }
      })}
    >
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface/80 p-3 sm:flex-row sm:items-start">
        <Avatar label={displayName || t('common.profile')} imageUrl={avatarSrc} size="lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-ink">{t('profile.photo')}</p>
            <p className="mt-0.5 text-xs text-muted">{t('profile.photoHelp')}</p>
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={(event) => {
                void uploadAsset('avatar', event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              disabled={avatarBusy}
              onClick={() => avatarInput.current?.click()}
            >
              {avatarBusy ? t('profile.uploading') : t('profile.uploadPhoto')}
            </Button>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{t('profile.cv')}</p>
            <p className="mt-0.5 text-xs text-muted">{t('profile.cvHelp')}</p>
            <input
              ref={cvInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                void uploadAsset('cv', event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={cvBusy}
                onClick={() => cvInput.current?.click()}
              >
                {cvBusy ? t('profile.uploading') : t('profile.uploadCv')}
              </Button>
              {hasUploadedCv ? (
                <Button type="button" variant="secondary" onClick={() => void openCv()}>
                  {t('profile.viewCv')}
                </Button>
              ) : null}
            </div>
          </div>
          {assetMessage ? (
            <p className={`text-sm ${assetSuccess ? 'text-ink' : 'text-danger'}`} role="alert">
              {assetMessage}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id="givenName"
          label={t('profile.givenName')}
          error={form.formState.errors.givenName?.message}
          {...form.register('givenName')}
        />
        <Input
          id="familyName"
          label={t('profile.familyName')}
          error={form.formState.errors.familyName?.message}
          {...form.register('familyName')}
        />
        <Input
          id="academicTitle"
          label={t('profile.academicTitle')}
          {...form.register('academicTitle')}
        />
        <Input id="specialty" label={t('profile.specialty')} {...form.register('specialty')} />
        <Input
          id="institution"
          label={t('profile.institution')}
          {...form.register('institution')}
        />
        <Input id="laboratory" label={t('profile.laboratory')} {...form.register('laboratory')} />
        <Input
          id="doctoralSchool"
          label={t('profile.doctoralSchool')}
          {...form.register('doctoralSchool')}
        />
        <Input id="city" label={t('profile.city')} {...form.register('city')} />
        <Input id="country" label={t('profile.country')} {...form.register('country')} />
        <Input
          id="orcid"
          label={t('profile.orcid')}
          placeholder="0000-0000-0000-0000"
          error={form.formState.errors.orcid?.message}
          {...form.register('orcid')}
        />
        <Input
          id="googleScholarUrl"
          label={t('profile.googleScholar')}
          error={form.formState.errors.googleScholarUrl?.message}
          {...form.register('googleScholarUrl')}
        />
        <Input
          id="linkedinUrl"
          label={t('profile.linkedin')}
          error={form.formState.errors.linkedinUrl?.message}
          {...form.register('linkedinUrl')}
        />
      </div>
      {message ? (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-ink">{t('profile.profileSaved')}</p> : null}
      <div className="mt-3">
        <Button type="submit" disabled={mutation.isPending}>
          {t('profile.saveProfile')}
        </Button>
      </div>
    </form>
  );
}

function localAvatarError(file: File, t: ReturnType<typeof useT>): string | null {
  if (file.size > 5 * 1024 * 1024) return t('profile.photoTooLarge');
  const ok = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  return ok ? null : t('profile.photoFormats');
}

function localCvError(file: File, t: ReturnType<typeof useT>): string | null {
  if (file.size > 15 * 1024 * 1024) return t('profile.cvTooLarge');
  const ok = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  return ok ? null : t('profile.cvFormats');
}

function assetErrorMessage(error: unknown, t: ReturnType<typeof useT>): string {
  if (error instanceof ApiClientError) return error.body.message;
  return formErrorMessage(error, t);
}
