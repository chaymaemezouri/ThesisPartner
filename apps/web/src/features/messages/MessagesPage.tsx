import { Button, EmptyState, Input, Modal, Skeleton } from '@thesispartner/ui';
import { IconAction } from '../../components/IconAction';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMeQuery } from '../../hooks/use-session';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import {
  useConversation,
  useConversations,
  useCreateGroup,
  useSendMessage,
  useUpdateGroup,
  type ConversationSummary,
  type GroupDraft,
} from './hooks/use-messages';

export function MessagesPage() {
  const t = useT();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const mailbox = useConversations();
  const me = useMeQuery();
  const actorId = me.data?.user.id;
  const known =
    !conversationId ||
    mailbox.data?.conversations.some((item) => item.id === conversationId) === true;

  useEffect(() => {
    if (!mailbox.data || !conversationId || known) return;
    const next = mailbox.data.conversations.find((item) => item.kind === 'DIRECT');
    void navigate(next ? `/messagerie/${next.id}` : '/messagerie', { replace: true });
  }, [conversationId, known, mailbox.data, navigate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      {mailbox.isLoading ? (
        <div aria-busy="true" className="p-4">
          <Skeleton className="h-40" />
        </div>
      ) : null}
      {mailbox.isError ? (
        <div className="p-4">
          <QueryError error={mailbox.error} />
        </div>
      ) : null}
      {mailbox.data ? (
        <div className="flex min-h-0 flex-1">
          <ConversationList
            conversations={mailbox.data.conversations}
            students={mailbox.data.students}
            selectedId={conversationId}
            actorId={actorId}
            hiddenOnMobile={Boolean(conversationId)}
          />
          <Thread
            conversationId={conversationId}
            actorId={actorId}
            students={mailbox.data.students}
          />
        </div>
      ) : null}
    </div>
  );
}

function ConversationList({
  conversations,
  students,
  selectedId,
  actorId,
  hiddenOnMobile,
}: {
  conversations: ConversationSummary[];
  students: { userId: string; displayName: string }[];
  selectedId?: string;
  actorId?: string;
  hiddenOnMobile: boolean;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [creating, setCreating] = useState(false);

  const names = conversations.map((item) => labelFor(item, actorId, t('messages.conversation')));

  return (
    <section
      className={
        hiddenOnMobile
          ? 'hidden min-h-0 w-full flex-col border-line lg:flex lg:w-[20rem] lg:border-r'
          : 'flex min-h-0 w-full flex-1 flex-col'
      }
    >
      <h2 className="sr-only">{t('messages.title')}</h2>
      {students.length > 0 ? (
        <div className="flex items-center justify-end border-b border-line px-4 py-3">
          <IconAction
            label={t('messages.newGroup')}
            icon="plus"
            onClick={() => setCreating(true)}
          />
        </div>
      ) : null}
      {conversations.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{t('messages.empty')}</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label={t('messages.inbox')}>
          {conversations.map((item, index) => {
            const active = item.id === selectedId;
            const name = names[index] ?? t('messages.conversation');
            const shared = names.filter((value) => value === name).length > 1;
            const preview = item.lastMessage?.body ?? (shared ? item.thesisTitle : null);
            return (
              <li key={item.id}>
                <Link
                  to={`/messagerie/${item.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center gap-3 bg-brand-soft/60 px-4 py-3'
                      : 'flex items-center gap-3 px-4 py-3 hover:bg-canvas'
                  }
                >
                  <ChatAvatar label={name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{name}</span>
                      {item.lastMessage ? (
                        <time
                          dateTime={item.lastMessage.createdAt}
                          className="shrink-0 text-[10px] text-muted"
                        >
                          {formatClock(item.lastMessage.createdAt, dateLocale)}
                        </time>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      {item.unread ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      ) : null}
                      <span className="truncate text-xs text-muted">
                        {preview ?? (item.kind === 'GROUP' ? t('messages.group') : '')}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {creating ? (
        <GroupDialog
          title={t('messages.newGroup')}
          students={students}
          pendingLabel={t('messages.createGroup')}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </section>
  );
}

function Thread({
  conversationId,
  actorId,
  students,
}: {
  conversationId?: string;
  actorId?: string;
  students: { userId: string; displayName: string }[];
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const conversation = useConversation(conversationId);
  const send = useSendMessage(conversationId ?? '');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const bottomRef = useRef<HTMLLIElement>(null);
  const messageCount = conversation.data?.messages.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [conversationId, messageCount]);

  if (!conversationId) {
    return (
      <div className="hidden min-h-0 flex-1 items-center justify-center bg-canvas lg:flex">
        <EmptyState title={t('messages.pickTitle')} description={t('messages.pickDescription')} />
      </div>
    );
  }

  const data = conversation.data;
  const canManage = data?.kind === 'GROUP' && actorId !== undefined && data.createdById === actorId;
  const name = data ? labelFor(data, actorId, t('messages.conversation')) : '';

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5">
        <Link to="/messagerie" className="text-sm text-brand lg:hidden" aria-label={t('messages.back')}>
          ‹
        </Link>
        {conversation.isLoading ? <Skeleton className="h-8 flex-1" /> : null}
        {conversation.isError ? <QueryError error={conversation.error} /> : null}
        {data ? (
          <>
            <ChatAvatar label={name} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-ink">{name}</h2>
              <p className="truncate text-[11px] text-muted">
                {data.kind === 'GROUP'
                  ? data.participants.map((person) => person.displayName).join(', ')
                  : (data.thesisTitle ?? t('messages.directHelp'))}
              </p>
            </div>
            {canManage ? (
              <Button
                variant="secondary"
                className="h-8 shrink-0 px-2.5 text-xs"
                onClick={() => setEditing(true)}
              >
                {t('messages.editGroup')}
              </Button>
            ) : null}
          </>
        ) : null}
      </header>
      <ol
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-4"
        aria-label={t('messages.thread')}
      >
        {data && data.messages.length === 0 ? (
          <li className="m-auto text-sm text-muted">{t('messages.noMessages')}</li>
        ) : null}
        {data?.messages.map((message) => {
          const own = message.authorId === actorId;
          return (
            <li key={message.id} className={own ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  own
                    ? 'max-w-[min(32rem,78%)] rounded-[1.15rem] rounded-br-[0.3rem] bg-brand px-3 py-2 text-white'
                    : 'max-w-[min(32rem,78%)] rounded-[1.15rem] rounded-bl-[0.3rem] border border-line bg-surface px-3 py-2 text-ink'
                }
              >
                {!own && data.kind === 'GROUP' ? (
                  <p className="mb-0.5 text-[11px] font-medium text-brand">{message.authorName}</p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                <time
                  dateTime={message.createdAt}
                  className={own ? 'mt-1 block text-[10px] text-white/75' : 'mt-1 block text-[10px] text-muted'}
                >
                  {formatClock(message.createdAt, dateLocale)}
                </time>
              </div>
            </li>
          );
        })}
        <li aria-hidden="true" ref={bottomRef} />
      </ol>
      {data ? (
        <div className="border-t border-line bg-surface">
          {send.isError ? (
            <p className="px-4 pt-2 text-xs text-warn">{queryErrorMessage(send.error, t)}</p>
          ) : null}
          <form
            className="flex items-end gap-2 px-3 py-2.5"
            onSubmit={async (event) => {
              event.preventDefault();
              const text = body.trim();
              if (!text) return;
              await send.mutateAsync(text);
              setBody('');
            }}
          >
            <label className="sr-only" htmlFor="message-body">
              {t('messages.body')}
            </label>
            <textarea
              id="message-body"
              value={body}
              rows={1}
              maxLength={4000}
              placeholder={t('messages.placeholder')}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-[1.25rem] border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              aria-label={t('messages.send')}
              disabled={send.isPending || body.trim().length === 0}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      ) : null}
      {data && canManage && editing ? (
        <GroupDialog
          title={t('messages.editGroup')}
          students={students}
          initial={{
            title: data.title ?? '',
            studentIds: data.participants
              .map((person) => person.userId)
              .filter((userId) => userId !== actorId),
          }}
          conversationId={data.id}
          pendingLabel={t('messages.saveGroup')}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </section>
  );
}

function GroupDialog({
  title,
  students,
  initial,
  conversationId,
  pendingLabel,
  onClose,
}: {
  title: string;
  students: { userId: string; displayName: string }[];
  initial?: GroupDraft;
  conversationId?: string;
  pendingLabel: string;
  onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateGroup();
  const update = useUpdateGroup(conversationId ?? '');
  const mutation = conversationId ? update : create;
  const [groupTitle, setGroupTitle] = useState(initial?.title ?? '');
  const [selected, setSelected] = useState<string[]>(initial?.studentIds ?? []);

  function close() {
    setGroupTitle(initial?.title ?? '');
    setSelected(initial?.studentIds ?? []);
    mutation.reset();
    onClose();
  }

  return (
    <Modal open title={title} closeLabel={t('common.close')} onClose={close}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const detail = await mutation.mutateAsync({ title: groupTitle, studentIds: selected });
          close();
          await navigate(`/messagerie/${detail.id}`);
        }}
      >
        <p className="text-xs text-muted">{t('messages.groupHelp')}</p>
        <Input
          id="group-title"
          label={t('messages.groupTitle')}
          value={groupTitle}
          maxLength={120}
          required
          onChange={(event) => setGroupTitle(event.target.value)}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-ink">{t('messages.chooseStudents')}</legend>
          {students.map((student) => {
            const checked = selected.includes(student.userId);
            return (
              <label key={student.userId} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelected((current) =>
                      checked
                        ? current.filter((id) => id !== student.userId)
                        : [...current, student.userId],
                    )
                  }
                />
                {student.displayName}
              </label>
            );
          })}
        </fieldset>
        {mutation.isError ? (
          <p className="text-xs text-warn">{queryErrorMessage(mutation.error, t)}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={mutation.isPending || selected.length === 0}>
            {pendingLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function labelFor(
  item: {
    kind: 'DIRECT' | 'GROUP';
    title: string | null;
    participants: { userId: string; displayName: string }[];
  },
  actorId: string | undefined,
  fallback: string,
): string {
  if (item.kind === 'GROUP') return item.title?.trim() || fallback;
  return item.participants.find((person) => person.userId !== actorId)?.displayName ?? fallback;
}

function formatClock(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function ChatAvatar({ label }: { label: string }) {
  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
    >
      {initials}
    </span>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3.2 11.2 20.4 4.1c.7-.3 1.4.4 1.1 1.1l-7.1 17.2c-.3.8-1.5.7-1.7-.1l-2.2-7.7-7.7-2.2c-.8-.2-.9-1.4-.1-1.7z" />
    </svg>
  );
}
