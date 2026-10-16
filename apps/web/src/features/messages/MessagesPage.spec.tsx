import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { MessagesPage } from './MessagesPage';

const actorId = '11111111-1111-4111-8111-111111111111';
const studentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const thesisId = '22222222-2222-4222-8222-222222222222';

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
  return render(
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
}

describe('messages page', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
