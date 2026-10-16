import {
  conversationLabel,
  isUnread,
  oneThreadPerCounterpart,
  singleSupervisorThread,
} from './messages-rules';

describe('message mailbox', () => {
  const actor = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  it('marks a message unread until it has been read', () => {
    const message = { authorId: other, createdAt: '2026-10-09T12:00:00.000Z' };
    expect(isUnread(message, null, actor)).toBe(true);
    expect(isUnread(message, '2026-10-09T11:00:00.000Z', actor)).toBe(true);
    expect(isUnread(message, '2026-10-09T12:00:00.000Z', actor)).toBe(false);
    expect(isUnread({ authorId: actor, createdAt: message.createdAt }, null, actor)).toBe(false);
    expect(isUnread(null, null, actor)).toBe(false);
  });

  it('keeps a single direct thread with the student’s supervisor', () => {
    const supervisor = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const items = [
      thread('older', 'thesis-a', '2026-10-01T00:00:00.000Z', supervisor),
      thread('current', 'thesis-b', '2026-10-02T00:00:00.000Z', supervisor),
      {
        id: 'group',
        kind: 'GROUP' as const,
        thesisId: null,
        updatedAt: '2026-10-03T00:00:00.000Z',
        participants: [{ userId: actor }, { userId: supervisor }],
      },
    ];
    expect(singleSupervisorThread(items, supervisor).map((item) => item.id)).toEqual([
      'current',
      'group',
    ]);
  });

  it('keeps one direct thread per student for a supervisor', () => {
    const student = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const items = [
      thread('first', 'thesis-a', '2026-10-01T00:00:00.000Z', student),
      thread('later', 'thesis-b', '2026-10-09T00:00:00.000Z', student),
    ];
    expect(oneThreadPerCounterpart(items, actor).map((item) => item.id)).toEqual(['later']);
  });

  it('names a direct thread after the other person and a group after its title', () => {
    const people = [
      { userId: actor, displayName: 'Noa Bernard' },
      { userId: other, displayName: 'Youssef El Amrani' },
    ];
    expect(conversationLabel('DIRECT', null, people, actor, 'Conversation')).toBe(
      'Youssef El Amrani',
    );
    expect(conversationLabel('GROUP', 'Séminaire', people, actor, 'Group')).toBe('Séminaire');
  });
});

function thread(id: string, thesisId: string, updatedAt: string, otherId: string) {
  return {
    id,
    kind: 'DIRECT' as const,
    thesisId,
    updatedAt,
    participants: [{ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, { userId: otherId }],
  };
}
