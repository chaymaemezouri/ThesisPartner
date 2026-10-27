import { conversationDetailSchema, conversationListSchema } from '@thesispartner/validation';
import { MessagesService } from './messages.service';

describe('MessagesService profile photos', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const studentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it.each([
    {
      avatarUrl: 'storage:users/student/avatar/photo.jpg',
      expected: `/api/v1/users/${studentId}/avatar`,
    },
    { avatarUrl: 'https://example.test/photo.jpg', expected: 'https://example.test/photo.jpg' },
    { avatarUrl: null, expected: null },
  ])(
    'includes the resolved photo in list and detail responses: $avatarUrl',
    async ({ avatarUrl, expected }) => {
      const conversation = {
        id: conversationId,
        kind: 'GROUP',
        title: 'Research group',
        thesisId: null,
        thesis: null,
        createdById: actorId,
        updatedAt: new Date('2026-10-22T12:00:00.000Z'),
        messages: [],
        members: [
          {
            userId: studentId,
            user: {
              id: studentId,
              email: 'student@example.test',
              profile: { displayName: 'Youssef El Amrani', avatarUrl },
            },
          },
        ],
      };
      const prisma = {
        thesisMembership: { findMany: jest.fn().mockResolvedValue([]) },
        conversationMember: {
          findMany: jest.fn().mockResolvedValue([{ conversation, lastReadAt: null }]),
          findUnique: jest.fn().mockResolvedValue({ conversation }),
          update: jest.fn().mockResolvedValue({}),
        },
        message: { findMany: jest.fn().mockResolvedValue([]) },
      };
      const service = new MessagesService(prisma as never, {} as never);
      const list = conversationListSchema.parse(await service.list(actorId));
      const detail = conversationDetailSchema.parse(await service.get(actorId, conversationId));
      const expectedParticipant = {
        userId: studentId,
        displayName: 'Youssef El Amrani',
        avatarUrl: expected,
      };
      expect(list.conversations[0]?.participants).toEqual([expectedParticipant]);
      expect(detail.participants).toEqual([expectedParticipant]);
      expect(prisma.conversationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            conversation: expect.objectContaining({
              include: expect.objectContaining({
                members: {
                  include: {
                    user: {
                      select: expect.objectContaining({
                        profile: { select: { displayName: true, avatarUrl: true } },
                      }),
                    },
                  },
                },
              }),
            }),
          }),
        }),
      );
    },
  );
});

describe('MessagesService edit, delete and conversation management', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const messageId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  function conversation(kind: 'DIRECT' | 'GROUP' = 'GROUP', createdById = actorId) {
    return {
      id: conversationId,
      kind,
      title: 'Research group',
      thesisId: null,
      thesis: null,
      createdById,
      members: [
        {
          userId: actorId,
          user: {
            id: actorId,
            email: 'noa@example.test',
            profile: { displayName: 'Noa Bernard', avatarUrl: null },
          },
        },
      ],
    };
  }

  function serviceWith(prisma: object) {
    return new MessagesService(prisma as never, { record: jest.fn() } as never);
  }

  it('edits a message the caller authored', async () => {
    const row = conversation();
    const tx = {
      message: { update: jest.fn() },
      conversation: { update: jest.fn() },
    };
    const prisma = {
      conversationMember: {
        findUnique: jest.fn().mockResolvedValue({ conversation: row }),
        update: jest.fn().mockResolvedValue({}),
      },
      message: {
        findFirst: jest.fn().mockResolvedValue({
          id: messageId,
          conversationId,
          authorId: actorId,
          deletedAt: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: tx.message.update,
      },
      conversation: { update: tx.conversation.update },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    };
    const service = serviceWith(prisma);
    await service.edit(actorId, conversationId, messageId, { body: '  Updated note  ' });
    expect(prisma.message.findFirst).toHaveBeenCalledWith({
      where: { id: messageId, conversationId, authorId: actorId, deletedAt: null },
    });
    expect(tx.message.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { body: 'Updated note', editedAt: expect.any(Date) },
    });
  });

  it('soft-deletes an authored message and clears a thread', async () => {
    const row = conversation('GROUP');
    const tx = {
      message: { update: jest.fn(), deleteMany: jest.fn() },
      conversation: { update: jest.fn() },
    };
    const prisma = {
      conversationMember: {
        findUnique: jest.fn().mockResolvedValue({ conversation: row }),
        update: jest.fn().mockResolvedValue({}),
      },
      message: {
        findFirst: jest.fn().mockResolvedValue({
          id: messageId,
          conversationId,
          authorId: actorId,
          deletedAt: null,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    };
    const service = serviceWith(prisma);
    await service.removeMessage(actorId, conversationId, messageId);
    expect(tx.message.update).toHaveBeenCalledWith({
      where: { id: messageId },
      data: { deletedAt: expect.any(Date), body: '' },
    });
    await service.clear(actorId, conversationId);
    expect(tx.message.deleteMany).toHaveBeenCalledWith({ where: { conversationId } });
  });

  it('lets a member leave a group and the creator delete it', async () => {
    const group = conversation('GROUP', otherId);
    const owned = conversation('GROUP', actorId);
    const tx = {
      conversationMember: { delete: jest.fn() },
      conversation: { delete: jest.fn() },
    };
    const prisma = {
      conversationMember: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ conversation: group })
          .mockResolvedValueOnce({ conversation: owned }),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    };
    const service = serviceWith(prisma);
    await expect(service.leave(actorId, conversationId)).resolves.toEqual({ id: conversationId });
    expect(tx.conversationMember.delete).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId, userId: actorId } },
    });
    await expect(service.removeConversation(actorId, conversationId)).resolves.toEqual({
      id: conversationId,
    });
    expect(tx.conversation.delete).toHaveBeenCalledWith({ where: { id: conversationId } });
  });
});
