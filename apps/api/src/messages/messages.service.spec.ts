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
