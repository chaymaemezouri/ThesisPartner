import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { MessagesPage } from './MessagesPage';
import { messageDetailKey, type ConversationDetail } from './hooks/use-messages';

const actorId = '11111111-1111-4111-8111-111111111111';
const studentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const thesisId = '22222222-2222-4222-8222-222222222222';
const secondId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const participants = [
  { userId: actorId, displayName: 'Noa Bernard' },
  { userId: studentId, displayName: 'Youssef El Amrani' },
];

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPage(node: ReactNode = <MessagesPage />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <LocaleProvider initialLocale="en">
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/messagerie']}>
          <Routes>
            <Route path="/messagerie" element={node} />
            <Route path="/messagerie/:conversationId" element={node} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </LocaleProvider>,
  );
  return { ...view, client };
}

function mockMailbox({
  failFirstSend = false,
  avatarUrl = null,
}: { failFirstSend?: boolean; avatarUrl?: string | null } = {}) {
  const summary = {
    id: conversationId,
    kind: 'DIRECT',
    title: null,
    thesisId,
    thesisTitle: 'Research methods',
    participants: participants.map((person) => ({
      ...person,
      avatarUrl: person.userId === studentId ? avatarUrl : null,
    })),
    lastMessage: null,
    unread: true,
    updatedAt: '2026-10-09T12:00:00.000Z',
  };
  const second = {
    ...summary,
    id: secondId,
    kind: 'GROUP',
    title: 'Research group',
    unread: false,
  };
  const messages = [
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      authorId: studentId,
      authorName: 'Youssef El Amrani',
      body: 'First question',
      createdAt: '2026-10-08T12:00:00.000Z',
    },
    {
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      authorId: actorId,
      authorName: 'Noa Bernard',
      body: 'First reply',
      createdAt: '2026-10-09T12:00:00.000Z',
    },
  ];
  let attempts = 0;
  const posts: { url: string; body: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me'))
        return json({
          user: {
            id: actorId,
            email: 'noa@example.test',
            emailVerified: true,
            platformRole: 'USER',
            givenName: 'Noa',
            familyName: 'Bernard',
            displayName: 'Noa Bernard',
          },
        });
      if (url.endsWith('/messages/conversations'))
        return json({ conversations: [summary, second], students: [] });
      const item = url.includes(secondId) ? second : summary;
      if (init?.method === 'POST') {
        attempts++;
        const payload = JSON.parse(String(init.body)) as { body: string };
        posts.push({ url, body: payload.body });
        if (failFirstSend && attempts === 1)
          return new Response('{}', {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        messages.push({
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          authorId: actorId,
          authorName: 'Noa Bernard',
          body: payload.body,
          createdAt: '2026-10-09T13:00:00.000Z',
        });
      }
      return json({
        ...item,
        createdById: actorId,
        messages: item.id === conversationId ? messages : [],
        lastMessage: undefined,
        unread: undefined,
        updatedAt: undefined,
      });
    }),
  );
  return posts;
}

describe('messages page', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('inserts an emoji at the cursor without sending and closes the picker with Escape', async () => {
    const user = userEvent.setup();
    const posts = mockMailbox();
    renderPage();
    await user.click(await screen.findByRole('link', { name: /Youssef/ }));
    const composer = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(composer, 'A B');
    (composer as HTMLTextAreaElement).setSelectionRange(2, 2);
    await user.click(screen.getByRole('button', { name: 'Emojis' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Emojis' })).getByRole('button', { name: '🙂' }),
    );
    await waitFor(() => expect(composer).toHaveValue('A 🙂B'));
    expect(posts).toHaveLength(0);
    expect(screen.queryByRole('group', { name: 'Emojis' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Emojis' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Emojis' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Emojis' })).toHaveFocus();
  });

  it('opens conversation details with the actual participants and thesis context', async () => {
    const user = userEvent.setup();
    mockMailbox();
    renderPage();
    await user.click(await screen.findByRole('link', { name: /Youssef/ }));
    await user.click(await screen.findByRole('button', { name: 'Conversation details' }));
    const details = screen.getByRole('dialog', { name: 'Conversation details' });
    expect(within(details).getByText('Research methods')).toBeInTheDocument();
    expect(within(details).getByText(/Noa Bernard/)).toBeInTheDocument();
    expect(within(details).getAllByText('Youssef El Amrani')).toHaveLength(2);
    await user.click(within(details).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows profile photos in the inbox, thread header and received messages, with initials if loading fails', async () => {
    const user = userEvent.setup();
    const avatarUrl = `/api/v1/users/${studentId}/avatar`;
    mockMailbox({ avatarUrl });
    renderPage();
    const link = await screen.findByRole('link', { name: /Youssef/ });
    const inboxPhoto = link.querySelector('img');
    expect(inboxPhoto).toHaveAttribute('src', avatarUrl);
    fireEvent.error(inboxPhoto!);
    expect(link.querySelector('img')).toBeNull();
    expect(within(link).getByText('YE')).toBeInTheDocument();
    await user.click(link);
    const heading = await screen.findByRole('heading', { name: 'Youssef El Amrani' });
    expect(heading.closest('header')?.querySelector('img')).toHaveAttribute('src', avatarUrl);
    expect(screen.getByRole('list', { name: 'Messages' }).querySelector('img')).toHaveAttribute(
      'src',
      avatarUrl,
    );
  });

  it('searches conversations and filters unread exchanges with a reset for empty results', async () => {
    const user = userEvent.setup();
    mockMailbox();
    renderPage();
    const inbox = await screen.findByRole('list', { name: 'Inbox' });
    await user.click(screen.getByRole('button', { name: /Unread/ }));
    expect(within(inbox).getByRole('link', { name: /Youssef/ })).toBeInTheDocument();
    expect(within(inbox).queryByRole('link', { name: /Research group/ })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search conversations' }), 'missing');
    expect(within(inbox).getByText('No conversations match these filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(within(inbox).getByRole('link', { name: /Research group/ })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'Research group');
    expect(within(inbox).queryByRole('link', { name: /Youssef/ })).not.toBeInTheDocument();
  });

  it('keeps separate drafts when moving between conversations and groups messages by date', async () => {
    const user = userEvent.setup();
    mockMailbox();
    renderPage();
    await user.click(await screen.findByRole('link', { name: /Youssef/ }));
    const composer = await screen.findByRole('textbox', { name: 'Message' });
    expect(screen.getAllByLabelText('Message date')).toHaveLength(2);
    await user.type(composer, 'Draft for Youssef');
    await user.click(screen.getByRole('link', { name: /Research group/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(''));
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Group draft');
    await user.click(screen.getByRole('link', { name: /Youssef/ }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Draft for Youssef'),
    );
  });

  it('retains a failed message for retry and clears it only after a successful send', async () => {
    const user = userEvent.setup();
    const posts = mockMailbox({ failFirstSend: true });
    renderPage();
    await user.click(await screen.findByRole('link', { name: /Youssef/ }));
    const composer = await screen.findByRole('textbox', { name: 'Message' });
    await user.type(composer, 'Review the methods');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(posts).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(composer).toHaveValue('Review the methods\n');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(composer).toHaveValue(''));
    expect(posts).toHaveLength(2);
    expect(posts[1]).toEqual({
      url: `/api/v1/messages/conversations/${conversationId}/messages`,
      body: 'Review the methods',
    });
    expect(
      within(screen.getByRole('list', { name: 'Messages' })).getByText('Review the methods'),
    ).toBeInTheDocument();
  });

  it('lets readers return to the latest message without interrupting an older exchange', async () => {
    const user = userEvent.setup();
    mockMailbox();
    const { client } = renderPage();
    await user.click(await screen.findByRole('link', { name: /Youssef/ }));
    const thread = await screen.findByRole('list', { name: 'Messages' });
    await screen.findByRole('textbox', { name: 'Message' });
    Object.defineProperties(thread, {
      scrollHeight: { value: 1000, configurable: true },
      clientHeight: { value: 300, configurable: true },
      scrollTop: { value: 0, configurable: true, writable: true },
    });
    fireEvent.scroll(thread);
    act(() => {
      client.setQueryData<ConversationDetail>(
        messageDetailKey(conversationId),
        (detail) =>
          detail && {
            ...detail,
            messages: [
              ...detail.messages,
              {
                id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
                authorId: studentId,
                authorName: 'Youssef El Amrani',
                body: 'New question',
                createdAt: '2026-10-09T14:00:00.000Z',
              },
            ],
          },
      );
    });
    await user.click(await screen.findByRole('button', { name: 'Latest messages' }));
    expect(screen.queryByRole('button', { name: 'Latest messages' })).not.toBeInTheDocument();
  });

  it('lists the direct exchange and lets a supervisor choose students for a group', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url.includes('/auth/me')) {
          return json({
            user: {
              id: actorId,
              email: 'noa@example.test',
              emailVerified: true,
              platformRole: 'USER',
              givenName: 'Noa',
              familyName: 'Bernard',
              displayName: 'Noa Bernard',
            },
          });
        }
        if (url.endsWith('/messages/conversations') && method === 'GET') {
          return json({
            conversations: [
              {
                id: conversationId,
                kind: 'DIRECT',
                title: null,
                thesisId,
                thesisTitle: null,
                participants,
                lastMessage: null,
                unread: false,
                updatedAt: '2026-10-09T12:00:00.000Z',
              },
            ],
            students: [{ userId: studentId, displayName: 'Youssef El Amrani' }],
          });
        }
        if (url.endsWith(`/messages/conversations/${conversationId}`) && method === 'GET') {
          return json({
            id: conversationId,
            kind: 'DIRECT',
            title: null,
            thesisId,
            thesisTitle: null,
            createdById: studentId,
            participants,
            messages: [],
          });
        }
        return json({ status: 'ok' });
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
    await user.click(await screen.findByRole('link', { name: /Youssef El Amrani/ }));
    expect(await screen.findByText('No message yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'New group' }));
    expect(
      screen.getByText('Choose the doctoral students who belong to this group.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Youssef El Amrani' })).toBeInTheDocument();
  });
});
