import { Button, Dropdown, Input, Modal, Skeleton } from '@thesispartner/ui';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconAction } from '../../components/IconAction';
import { Icon } from '../../components/Icon';
import { useMeQuery } from '../../hooks/use-session';
import { useLocale, useT } from '../../i18n/LocaleContext';
import { QueryError, queryErrorMessage } from '../objectives/components/QueryError';
import {
  useClearConversation,
  useConversation,
  useConversations,
  useCreateGroup,
  useDeleteConversation,
  useDeleteMessage,
  useEditMessage,
  useLeaveConversation,
  useSendMessage,
  useUpdateGroup,
  type ConversationSummary,
  type GroupDraft,
} from './hooks/use-messages';

export function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const mailbox = useConversations();
  const me = useMeQuery();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
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
        <div className="flex min-h-0 flex-1 overflow-hidden bg-surface">
          <ConversationList
            conversations={mailbox.data.conversations}
            students={mailbox.data.students}
            selectedId={conversationId}
            actorId={actorId}
            accountName={me.data?.user.displayName}
            hiddenOnMobile={Boolean(conversationId)}
          />
          <Thread
            key={conversationId ?? 'inbox'}
            conversationId={conversationId}
            actorId={actorId}
            students={mailbox.data.students}
            body={drafts[conversationId ?? ''] ?? ''}
            onBodyChange={(value) => {
              if (conversationId) setDrafts((current) => ({ ...current, [conversationId]: value }));
            }}
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
  accountName,
  hiddenOnMobile,
}: {
  conversations: ConversationSummary[];
  students: { userId: string; displayName: string }[];
  selectedId?: string;
  actorId?: string;
  accountName?: string;
  hiddenOnMobile: boolean;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const names = conversations.map((item) => labelFor(item, actorId, t('messages.conversation')));
  const needle = search.trim().toLocaleLowerCase(dateLocale);
  const unreadCount = conversations.filter((item) => item.unread).length;
  const visible = conversations.filter((item, index) => {
    const matches = `${names[index]} ${item.thesisTitle ?? ''} ${item.lastMessage?.body ?? ''}`
      .toLocaleLowerCase(dateLocale)
      .includes(needle);
    return matches && (!unreadOnly || item.unread || item.id === selectedId);
  });

  return (
    <section
      className={
        hiddenOnMobile
          ? 'hidden min-h-0 w-full shrink-0 flex-col border-line/70 lg:flex lg:w-[22rem] lg:border-r xl:w-[24rem]'
          : 'flex min-h-0 w-full shrink-0 flex-col border-line/70 lg:w-[22rem] lg:border-r xl:w-[24rem]'
      }
    >
      <div className="shrink-0 space-y-4 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">
            {accountName ?? t('messages.title')}
          </p>
          {students.length > 0 ? (
            <IconAction
              label={t('messages.newGroup')}
              icon="pencil"
              showLabel={false}
              tone="neutral"
              className="rounded-full border-transparent! shadow-none! hover:bg-canvas"
              onClick={() => setCreating(true)}
            />
          ) : null}
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-[#f3f4f6] px-3.5 focus-within:ring-2 focus-within:ring-brand/20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <span className="sr-only">{t('messages.search')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('messages.search')}
            className="h-9 min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-muted focus-visible:outline-none!"
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            {t('messages.title')}
            <span aria-hidden="true" className="text-[11px] font-normal tabular-nums text-muted">
              {conversations.length}
            </span>
          </h2>
          <div className="flex gap-1" role="group" aria-label={t('messages.filter')}>
            {([false, true] as const).map((unread) => (
              <button
                key={String(unread)}
                type="button"
                aria-pressed={unreadOnly === unread}
                onClick={() => setUnreadOnly(unread)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${unreadOnly === unread ? 'bg-ink/7 font-semibold text-ink' : 'text-muted hover:bg-canvas'}`}
              >
                {t(unread ? 'messages.unread' : 'messages.all')}
                {unread && unreadCount > 0 ? (
                  <span className="ml-1.5 tabular-nums">{unreadCount}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
      {conversations.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">{t('messages.empty')}</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1" aria-label={t('messages.inbox')}>
          {visible.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-muted">
              <p>{t('messages.noMatches')}</p>
              <button
                type="button"
                className="mt-2 text-brand hover:underline"
                onClick={() => {
                  setSearch('');
                  setUnreadOnly(false);
                }}
              >
                {t('messages.resetFilters')}
              </button>
            </li>
          ) : null}
          {visible.map((item) => {
            const active = item.id === selectedId;
            const name = labelFor(item, actorId, t('messages.conversation'));
            const shared = names.filter((value) => value === name).length > 1;
            const preview = item.lastMessage?.body ?? (shared ? item.thesisTitle : null);
            return (
              <li key={item.id}>
                <Link
                  to={`/messagerie/${item.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center gap-3 bg-[#f3f4f6] px-5 py-3'
                      : 'flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f8f9fb]'
                  }
                >
                  <ChatAvatar
                    label={name}
                    imageUrl={avatarFor(item, actorId)}
                    group={item.kind === 'GROUP'}
                    size="list"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm text-ink ${item.unread ? 'font-semibold' : 'font-medium'}`}
                      >
                        {name}
                      </span>
                      {item.lastMessage ? (
                        <time
                          dateTime={item.lastMessage.createdAt}
                          className="shrink-0 text-[10px] text-muted"
                        >
                          {dayKey(item.lastMessage.createdAt) === dayKey(new Date().toISOString())
                            ? formatClock(item.lastMessage.createdAt, dateLocale)
                            : new Date(item.lastMessage.createdAt).toLocaleDateString(dateLocale, {
                                day: 'numeric',
                                month: 'short',
                              })}
                        </time>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      {item.unread ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          role="img"
                          aria-label={t('messages.unread')}
                        />
                      ) : null}
                      <span className="truncate text-xs text-muted">
                        {item.lastMessage?.authorId === actorId ? `${t('messages.you')}: ` : ''}
                        {preview ?? t(item.kind === 'GROUP' ? 'messages.group' : 'messages.direct')}
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
  body,
  onBodyChange,
}: {
  conversationId?: string;
  actorId?: string;
  students: { userId: string; displayName: string }[];
  body: string;
  onBodyChange: (value: string) => void;
}) {
  const t = useT();
  const { dateLocale } = useLocale();
  const navigate = useNavigate();
  const conversation = useConversation(conversationId);
  const send = useSendMessage(conversationId ?? '');
  const editMessage = useEditMessage(conversationId ?? '');
  const deleteMessage = useDeleteMessage(conversationId ?? '');
  const clearConversation = useClearConversation(conversationId ?? '');
  const leaveConversation = useLeaveConversation(conversationId ?? '');
  const deleteConversation = useDeleteConversation(conversationId ?? '');
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showLatest, setShowLatest] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'clear' | 'leave' | 'deleteGroup' | null>(null);
  const bottomRef = useRef<HTMLLIElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const sending = useRef(false);
  const latestMessageId = conversation.data?.messages.at(-1)?.id;

  useEffect(() => {
    if (nearBottom.current) bottomRef.current?.scrollIntoView?.({ block: 'end' });
    else setShowLatest(true);
  }, [conversationId, latestMessageId]);

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 128)}px`;
  }, [body, conversation.isSuccess]);

  if (!conversationId)
    return (
      <div className="hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-surface p-6 lg:flex">
        <span className="grid h-20 w-20 place-items-center rounded-full border-2 border-ink text-ink">
          <SendIcon />
        </span>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-ink">{t('messages.pickTitle')}</h2>
          <p className="mt-2 text-xs text-muted">{t('messages.pickDescription')}</p>
        </div>
      </div>
    );

  const data = conversation.data;
  const canManage = data?.kind === 'GROUP' && actorId !== undefined && data.createdById === actorId;
  const canLeave = data?.kind === 'GROUP' && actorId !== undefined && data.createdById !== actorId;
  const name = data ? labelFor(data, actorId, t('messages.conversation')) : '';
  const busy =
    send.isPending ||
    editMessage.isPending ||
    deleteMessage.isPending ||
    clearConversation.isPending ||
    leaveConversation.isPending ||
    deleteConversation.isPending;

  async function afterLeave() {
    setConfirm(null);
    setDetailsOpen(false);
    await navigate('/messagerie');
  }

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line/70 bg-surface px-4 py-3 sm:px-6">
        <Link
          to="/messagerie"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink hover:bg-canvas lg:hidden"
          aria-label={t('messages.back')}
        >
          <Icon name="back" className="h-4 w-4" />
        </Link>
        {conversation.isLoading ? <Skeleton className="h-8 flex-1" /> : null}
        {conversation.isError ? <QueryError error={conversation.error} /> : null}
        {data ? (
          <>
            <ChatAvatar
              label={name}
              imageUrl={avatarFor(data, actorId)}
              group={data.kind === 'GROUP'}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-ink">{name}</h2>
              <p className="truncate text-[11px] text-muted">
                {data.kind === 'GROUP'
                  ? data.participants.map((person) => person.displayName).join(', ')
                  : (data.thesisTitle ?? t('messages.directHelp'))}
              </p>
            </div>
            <Dropdown
              menuLabel={t('messages.conversationActions')}
              label={
                <span className="grid h-9 w-9 place-items-center">
                  <span className="sr-only">{t('messages.conversationActions')}</span>
                  <Icon name="menu" className="h-5 w-5" />
                </span>
              }
            >
              {(close) => (
                <>
                  {canManage ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                      onClick={() => {
                        close();
                        setEditing(true);
                      }}
                    >
                      {t('messages.editGroup')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
                    onClick={() => {
                      close();
                      setConfirm('clear');
                    }}
                  >
                    {t('messages.clearConversation')}
                  </button>
                  {canLeave ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                      onClick={() => {
                        close();
                        setConfirm('leave');
                      }}
                    >
                      {t('messages.leaveGroup')}
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                      onClick={() => {
                        close();
                        setConfirm('deleteGroup');
                      }}
                    >
                      {t('messages.deleteGroup')}
                    </button>
                  ) : null}
                </>
              )}
            </Dropdown>
            <button
              type="button"
              aria-label={t('messages.details')}
              title={t('messages.details')}
              aria-haspopup="dialog"
              onClick={() => setDetailsOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <MessageIcon name="info" className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </header>
      <ol
        className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6"
        aria-label={t('messages.thread')}
        onScroll={(event) => {
          const list = event.currentTarget;
          nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 96;
          if (nearBottom.current) setShowLatest(false);
        }}
      >
        {data && data.messages.length === 0 ? (
          <li className="m-auto flex max-w-sm flex-col items-center gap-3 px-5 py-8 text-center">
            <ChatAvatar
              label={name}
              imageUrl={avatarFor(data, actorId)}
              group={data.kind === 'GROUP'}
              size="profile"
            />
            <p className="text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">{t('messages.noMessages')}</p>
          </li>
        ) : null}
        {data?.messages.map((message, index) => {
          const own = message.authorId === actorId;
          const previous = data.messages[index - 1];
          const next = data.messages[index + 1];
          const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
          const continuesPrevious =
            !newDay &&
            previous.authorId === message.authorId &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <
              5 * 60_000;
          const continuesNext = Boolean(
            next &&
            next.authorId === message.authorId &&
            dayKey(next.createdAt) === dayKey(message.createdAt) &&
            new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() < 5 * 60_000,
          );
          return (
            <Fragment key={message.id}>
              {newDay ? (
                <li
                  className="flex justify-center pt-6 pb-5"
                  aria-label={t('messages.dateSeparator')}
                >
                  <time
                    dateTime={dayKey(message.createdAt)}
                    className="shrink-0 text-[11px] font-medium text-muted"
                  >
                    {dayKey(message.createdAt) === dayKey(new Date().toISOString())
                      ? t('messages.today')
                      : new Date(message.createdAt).toLocaleDateString(dateLocale, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                  </time>
                </li>
              ) : null}
              <li
                className={`flex items-end gap-2 ${own ? 'justify-end' : 'justify-start'} ${continuesPrevious ? 'mt-0.5' : 'mt-3'}`}
              >
                {!own ? (
                  <span className="mb-4 w-6 shrink-0">
                    {!continuesNext ? (
                      <ChatAvatar
                        label={message.authorName}
                        imageUrl={
                          data.participants.find((person) => person.userId === message.authorId)
                            ?.avatarUrl
                        }
                        size="message"
                      />
                    ) : null}
                  </span>
                ) : null}
                <div className="min-w-0 max-w-[min(36rem,82%)] sm:max-w-[72%]">
                  {own && !message.deleted && editingId !== message.id ? (
                    <div className="mb-1 flex justify-end gap-0.5">
                      <button
                        type="button"
                        aria-label={t('messages.editMessage')}
                        title={t('messages.editMessage')}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                        onClick={() => {
                          setEditingId(message.id);
                          setEditDraft(message.body);
                        }}
                      >
                        <Icon name="pencil" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t('messages.deleteMessage')}
                        title={t('messages.deleteMessage')}
                        className="grid h-7 w-7 place-items-center rounded-full text-danger hover:bg-danger-soft"
                        onClick={() => setPendingDeleteId(message.id)}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                  <div
                    className={`rounded-[20px] px-3.5 py-2.5 ${
                      message.deleted
                        ? 'bg-canvas text-muted'
                        : own
                          ? `bg-gradient-to-br from-[#8061f2] via-[#6956e9] to-[#5368e8] text-white ${continuesPrevious ? 'rounded-tr-md' : ''} ${continuesNext ? 'rounded-br-md' : ''}`
                          : `bg-[#f1f2f5] text-ink ${continuesPrevious ? 'rounded-tl-md' : ''} ${continuesNext ? 'rounded-bl-md' : ''}`
                    }`}
                  >
                    {!own && data.kind === 'GROUP' && !continuesPrevious ? (
                      <p className="mb-1 text-[11px] font-medium text-muted">
                        {message.authorName}
                      </p>
                    ) : null}
                    {message.deleted ? (
                      <p className="text-sm italic">{t('messages.deletedMessage')}</p>
                    ) : editingId === message.id ? (
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const text = editDraft.trim();
                          if (!text) return;
                          try {
                            await editMessage.mutateAsync({ messageId: message.id, body: text });
                            setEditingId(null);
                          } catch {
                            // The mutation error is shown on the composer.
                          }
                        }}
                      >
                        <label className="sr-only" htmlFor={`edit-${message.id}`}>
                          {t('messages.editMessage')}
                        </label>
                        <textarea
                          id={`edit-${message.id}`}
                          value={editDraft}
                          maxLength={4000}
                          rows={3}
                          className="w-full rounded-xl bg-white/90 px-2 py-1.5 text-sm text-ink outline-none"
                          onChange={(event) => setEditDraft(event.target.value)}
                        />
                        {editMessage.isError ? (
                          <p className="text-[11px] text-white" role="alert">
                            {queryErrorMessage(editMessage.error, t)}
                          </p>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs text-white/80 hover:text-white"
                            onClick={() => setEditingId(null)}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={editMessage.isPending || editDraft.trim().length === 0}
                            className="text-xs font-semibold text-white"
                          >
                            {t('messages.saveEdit')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
                        {message.body}
                      </p>
                    )}
                  </div>
                  {!continuesNext ? (
                    <time
                      dateTime={message.createdAt}
                      className={`mt-1 block px-1 text-[10px] text-muted ${own ? 'text-right' : 'text-left'}`}
                    >
                      {formatClock(message.createdAt, dateLocale)}
                      {message.editedAt && !message.deleted ? ` · ${t('messages.edited')}` : ''}
                    </time>
                  ) : null}
                </div>
              </li>
            </Fragment>
          );
        })}
        <li aria-hidden="true" ref={bottomRef} />
      </ol>
      {showLatest ? (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-brand shadow-control"
            onClick={() => {
              nearBottom.current = true;
              bottomRef.current?.scrollIntoView?.({ block: 'end' });
              setShowLatest(false);
            }}
          >
            {t('messages.latest')}
          </button>
        </div>
      ) : null}
      {data ? (
        <div className="shrink-0 bg-surface p-3 sm:px-5 sm:pb-4">
          {send.isError ? (
            <p className="mb-2 text-xs text-danger" role="alert">
              {queryErrorMessage(send.error, t)}
            </p>
          ) : null}
          <form
            className="flex items-end gap-2 rounded-[26px] border border-line bg-surface px-3 py-1.5 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10"
            onSubmit={async (event) => {
              event.preventDefault();
              const text = body.trim();
              if (!text || sending.current || send.isPending) return;
              sending.current = true;
              try {
                await send.mutateAsync(text);
                nearBottom.current = true;
                onBodyChange('');
                bottomRef.current?.scrollIntoView?.({ block: 'end' });
                setShowLatest(false);
              } catch {
                // Keep the draft for retry; the mutation error is displayed above.
              } finally {
                sending.current = false;
              }
            }}
          >
            <EmojiPicker
              disabled={send.isPending}
              onChoose={(emoji) => {
                const field = textareaRef.current;
                const start = field?.selectionStart ?? body.length;
                const end = field?.selectionEnd ?? body.length;
                const next = body.slice(0, start) + emoji + body.slice(end);
                if (next.length > 4000) return;
                onBodyChange(next);
                setTimeout(() => {
                  field?.focus();
                  field?.setSelectionRange(start + emoji.length, start + emoji.length);
                }, 0);
              }}
            />
            <label className="sr-only" htmlFor="message-body">
              {t('messages.body')}
            </label>
            <textarea
              id="message-body"
              ref={textareaRef}
              value={body}
              rows={1}
              maxLength={4000}
              placeholder={t('messages.placeholder')}
              disabled={send.isPending}
              className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-none! disabled:opacity-60"
              onChange={(event) => onBodyChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              aria-label={t('messages.send')}
              disabled={send.isPending || body.trim().length === 0}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full px-2 text-xs font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('messages.send')}
            </button>
          </form>
          <p className="mt-2 hidden text-[10px] text-muted sm:block">
            {t('messages.keyboardHint')}
          </p>
        </div>
      ) : null}
      {data && detailsOpen ? (
        <Modal
          open
          title={t('messages.details')}
          closeLabel={t('common.close')}
          onClose={() => setDetailsOpen(false)}
        >
          <div className="flex flex-col items-center gap-3 border-b border-line pb-5 text-center">
            <ChatAvatar
              label={name}
              imageUrl={avatarFor(data, actorId)}
              group={data.kind === 'GROUP'}
              size="profile"
            />
            <p className="text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">
              {data.kind === 'GROUP' ? t('messages.group') : t('messages.directHelp')}
            </p>
          </div>
          {data.thesisTitle ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">{data.thesisTitle}</p>
          ) : null}
          <h3 className="mt-5 text-xs font-semibold text-ink">{t('messages.participants')}</h3>
          <ul className="mt-2 space-y-3">
            {data.participants.map((person) => (
              <li key={person.userId} className="flex items-center gap-3">
                <ChatAvatar label={person.displayName} imageUrl={person.avatarUrl} />
                <span className="min-w-0 break-words text-sm text-ink">
                  {person.displayName}
                  {person.userId === actorId ? (
                    <span className="ml-1 text-xs text-muted">({t('messages.you')})</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              className="h-9 text-xs"
              onClick={() => {
                setDetailsOpen(false);
                setConfirm('clear');
              }}
            >
              {t('messages.clearConversation')}
            </Button>
            {canLeave ? (
              <Button
                type="button"
                variant="secondary"
                className="h-9 text-xs text-danger"
                onClick={() => {
                  setDetailsOpen(false);
                  setConfirm('leave');
                }}
              >
                {t('messages.leaveGroup')}
              </Button>
            ) : null}
            {canManage ? (
              <Button
                type="button"
                variant="secondary"
                className="h-9 text-xs text-danger"
                onClick={() => {
                  setDetailsOpen(false);
                  setConfirm('deleteGroup');
                }}
              >
                {t('messages.deleteGroup')}
              </Button>
            ) : null}
          </div>
        </Modal>
      ) : null}
      {pendingDeleteId ? (
        <Modal
          open
          title={t('messages.deleteMessage')}
          closeLabel={t('common.close')}
          onClose={() => setPendingDeleteId(null)}
        >
          <p className="text-sm text-ink">{t('messages.deleteMessageConfirm')}</p>
          {deleteMessage.isError ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {queryErrorMessage(deleteMessage.error, t)}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                try {
                  await deleteMessage.mutateAsync(pendingDeleteId);
                  setPendingDeleteId(null);
                } catch {
                  // Keep the dialog open so the error can be read.
                }
              }}
            >
              {t('common.delete')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPendingDeleteId(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Modal>
      ) : null}
      {confirm ? (
        <Modal
          open
          title={
            confirm === 'clear'
              ? t('messages.clearConversation')
              : confirm === 'leave'
                ? t('messages.leaveGroup')
                : t('messages.deleteGroup')
          }
          closeLabel={t('common.close')}
          onClose={() => setConfirm(null)}
        >
          <p className="text-sm text-ink">
            {confirm === 'clear'
              ? t('messages.clearConversationConfirm')
              : confirm === 'leave'
                ? t('messages.leaveGroupConfirm')
                : t('messages.deleteGroupConfirm')}
          </p>
          {(clearConversation.isError || leaveConversation.isError || deleteConversation.isError) ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {queryErrorMessage(
                clearConversation.error ?? leaveConversation.error ?? deleteConversation.error,
                t,
              )}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                try {
                  if (confirm === 'clear') {
                    await clearConversation.mutateAsync();
                    setConfirm(null);
                    return;
                  }
                  if (confirm === 'leave') {
                    await leaveConversation.mutateAsync();
                    await afterLeave();
                    return;
                  }
                  await deleteConversation.mutateAsync();
                  await afterLeave();
                } catch {
                  // Keep the dialog open so the error can be read.
                }
              }}
            >
              {t('common.confirm')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirm(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Modal>
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

function EmojiPicker({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (emoji: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={t('messages.emojis')}
        aria-expanded={open}
        aria-controls="message-emojis"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-8 place-items-center rounded-full text-ink transition-colors hover:bg-canvas disabled:opacity-40"
      >
        <MessageIcon name="smile" className="h-5 w-5" />
      </button>
      {open ? (
        <div
          id="message-emojis"
          role="group"
          aria-label={t('messages.emojis')}
          className="absolute bottom-full left-0 z-20 mb-3 w-52 rounded-2xl border border-line bg-surface p-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
        >
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted">{t('messages.emojis')}</p>
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-canvas"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-0.5">
            {['🙂', '😊', '👍', '🙏', '✅', '🎉', '📚', '💡', '👋', '👏', '✨', '💬'].map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChoose(emoji);
                    setOpen(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-sm hover:bg-canvas"
                >
                  {emoji}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
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

function avatarFor(
  item: Pick<ConversationSummary, 'kind' | 'participants'>,
  actorId?: string,
): string | null {
  if (item.kind === 'GROUP' || !actorId) return null;
  return item.participants.find((person) => person.userId !== actorId)?.avatarUrl ?? null;
}

function formatClock(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ChatAvatar({
  label,
  imageUrl,
  group = false,
  size = 'header',
}: {
  label: string;
  imageUrl?: string | null;
  group?: boolean;
  size?: 'header' | 'list' | 'message' | 'profile';
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${size === 'profile' ? 'h-16 w-16 text-xs' : size === 'list' ? 'h-12 w-12 text-xs' : size === 'message' ? 'h-6 w-6 text-[9px]' : 'h-10 w-10 text-xs'} ${group ? 'bg-violet-soft text-violet' : 'bg-brand-soft text-brand'}`}
    >
      {group ? (
        <Icon name="supervision" className="h-4 w-4" />
      ) : imageUrl && failedSrc !== imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(imageUrl)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

function MessageIcon({ name, className }: { name: 'info' | 'smile'; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      {name === 'info' ? (
        <path d="M12 11v6M12 7h.01" />
      ) : (
        <path d="M8 14s1.5 3 4 3 4-3 4-3M8.5 8.5h.01M15.5 8.5h.01" />
      )}
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 4 18 1-8 16-3-9-7-8ZM10 12 21 5" />
    </svg>
  );
}
