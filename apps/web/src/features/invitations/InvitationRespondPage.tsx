import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@thesispartner/ui';
import { ApiClientError } from '../../api/client';
import { useMeQuery } from '../../hooks/use-session';
import { useT } from '../../i18n/LocaleContext';
import { useInvitationPreview, useRespondInvitation } from './hooks/use-invitations';

export function InvitationRespondPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? undefined;
  const me = useMeQuery();
  const preview = useInvitationPreview(token);
  const respond = useRespondInvitation();

  if (!token) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold text-ink">{t('invitations.invalidTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('invitations.invalidBody')}</p>
      </main>
    );
  }

  const sessionPending = me.isLoading || (me.isFetching && !me.data && !me.isError);
  if (preview.isLoading || sessionPending) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </main>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-lg font-semibold text-ink">{t('invitations.invalidTitle')}</h1>
        <p className="mt-2 text-sm text-danger" role="alert">
          {preview.error instanceof ApiClientError
            ? preview.error.body.message
            : t('invitations.invalidBody')}
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
          {t('common.back')}
        </Link>
      </main>
    );
  }

  const data = preview.data;
  const loggedIn = Boolean(me.data?.user);
  const emailMatch = me.data?.user.email === data.email;
  const pending = data.status === 'PENDING';

  const onRespond = async (action: 'accept' | 'reject') => {
    try {
      await respond.mutateAsync({ token, action });
      await navigate(action === 'accept' ? '/' : '/invitations');
    } catch {
      /* surfaced below */
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-lg font-semibold tracking-tight text-ink">
        {t('invitations.respondTitle')}
      </h1>
      <p className="mt-2 text-sm text-muted">{t('invitations.respondSubtitle')}</p>

      <dl className="mt-6 space-y-3 rounded-md border border-line bg-surface px-4 py-4 text-sm">
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('invitations.thesis')}
          </dt>
          <dd className="mt-0.5 font-medium text-ink">{data.thesisTitle}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('invitations.from')}
          </dt>
          <dd className="mt-0.5 text-ink">{data.invitedByName}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {t('invitations.role')}
          </dt>
          <dd className="mt-0.5 text-ink">
            {data.role === 'SUPERVISOR'
              ? t('thesis.roles.SUPERVISOR')
              : data.role === 'DOCTORAL_STUDENT'
                ? t('thesis.roles.DOCTORAL_STUDENT')
                : t('thesis.roles.ADMIN')}
          </dd>
        </div>
        {data.replacesSupervisor ? (
          <p className="text-sm text-muted">{t('invitations.replacesNotice')}</p>
        ) : null}
      </dl>

      {!pending ? (
        <p className="mt-4 text-sm text-muted">
          {t('invitations.statusLine', { status: data.status })}
        </p>
      ) : !loggedIn ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted">
            {data.requiresAccount
              ? t('invitations.needRegister', { email: data.email })
              : t('invitations.needLogin', { email: data.email })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/connexion?email=${encodeURIComponent(data.email)}&next=${encodeURIComponent(`/invitation?token=${token}`)}`}
              className="inline-flex h-10 items-center rounded-lg border border-brand bg-brand px-4 text-sm font-semibold text-white"
            >
              {t('auth.loginTitle')}
            </Link>
            {data.requiresAccount ? (
              <Link
                to={`/inscription?email=${encodeURIComponent(data.email)}&next=${encodeURIComponent(`/invitation?token=${token}`)}`}
                className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink"
              >
                {t('auth.registerTitle')}
              </Link>
            ) : null}
          </div>
        </div>
      ) : !emailMatch ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {t('invitations.wrongAccount', {
            expected: data.email,
            actual: me.data?.user.email ?? '',
          })}
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={respond.isPending}
            onClick={() => void onRespond('accept')}
          >
            {t('invitations.accept')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={respond.isPending}
            onClick={() => void onRespond('reject')}
          >
            {t('invitations.reject')}
          </Button>
        </div>
      )}

      {respond.isError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {respond.error instanceof ApiClientError
            ? respond.error.body.message
            : t('errors.generic')}
        </p>
      ) : null}
    </main>
  );
}
