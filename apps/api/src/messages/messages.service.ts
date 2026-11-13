import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type {
  createMessageGroupSchema,
  createMessageSchema,
  updateMessageSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { CollaborationNotice } from '../collaboration/collaboration-notice.service';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { resolveAvatarUrl } from '../profile/profile.service';
import { commitAfterUpload } from '../storage/commit-upload';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import { isUnread, oneThreadPerCounterpart, singleSupervisorThread } from './messages-rules';

const VOICE_MAX_BYTES = 10 * 1024 * 1024;
const VOICE_MIMES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
]);

type GroupDraft = z.infer<typeof createMessageGroupSchema>;
type MessageDraft = z.infer<typeof createMessageSchema>;
type MessageUpdate = z.infer<typeof updateMessageSchema>;

const personSelect = {
  id: true,
  email: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} satisfies Prisma.UserSelect;

type Person = Prisma.UserGetPayload<{ select: typeof personSelect }>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notice: CollaborationNotice,
    @Inject(OBJECT_STORAGE) private readonly objects: ObjectStorage,
  ) {}

  async list(actorId: string) {
    await this.ensureDirectConversations(actorId);
    const [rows, students] = await Promise.all([
      this.prisma.conversationMember.findMany({
        where: { userId: actorId },
        include: {
          conversation: {
            include: {
              thesis: { select: { title: true } },
              members: { include: { user: { select: personSelect } } },
              messages: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      this.supervisedStudents(actorId),
    ]);

    const conversations = rows
      .map((row) => {
        const last = row.conversation.messages[0] ?? null;
        return {
          id: row.conversation.id,
          kind: row.conversation.kind,
          title: row.conversation.title,
          thesisId: row.conversation.thesisId,
          thesisTitle: row.conversation.thesis?.title ?? null,
          participants: row.conversation.members.map((member) => ({
            userId: member.userId,
            displayName: personName(member.user),
            avatarUrl: resolveAvatarUrl(member.userId, member.user.profile?.avatarUrl),
          })),
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                authorId: last.authorId,
                createdAt: last.createdAt.toISOString(),
                hasAudio: Boolean(last.audioStorageKey),
              }
            : null,
          unread: isUnread(
            last ? { authorId: last.authorId, createdAt: last.createdAt.toISOString() } : null,
            row.lastReadAt?.toISOString() ?? null,
            actorId,
          ),
          updatedAt: (last?.createdAt ?? row.conversation.updatedAt).toISOString(),
        };
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    const placement = await this.placement(actorId);
    const visible =
      placement.kind === 'student'
        ? singleSupervisorThread(conversations, placement.supervisorId)
        : placement.kind === 'supervisor'
          ? oneThreadPerCounterpart(conversations, actorId)
          : conversations.filter((item) => item.kind === 'GROUP');

    return { conversations: visible, students };
  }

  async get(actorId: string, conversationId: string) {
    const conversation = await this.visibleConversation(actorId, conversationId);
    if (conversation.kind === 'DIRECT') {
      const placement = await this.placement(actorId);
      if (placement.kind === 'student') {
        const counterpart = conversation.members.some(
          (member) => member.userId === placement.supervisorId,
        );
        const allowed = counterpart
          ? await this.findDirect(actorId, placement.supervisorId ?? '')
          : null;
        if (!allowed || allowed.id !== conversation.id) {
          throw new AppException(404, 'NOT_FOUND', 'Resource not found');
        }
      }
    }
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { author: { select: personSelect } },
    });
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: actorId } },
      data: { lastReadAt: new Date() },
    });
    return this.toDetail(conversation, messages.reverse());
  }

  async createGroup(actorId: string, body: GroupDraft, requestId?: string) {
    const chosen = await this.chosenStudents(actorId, body.studentIds);
    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          kind: 'GROUP',
          title: body.title.trim(),
          createdById: actorId,
          members: {
            create: [{ userId: actorId }, ...chosen.map((userId) => ({ userId }))],
          },
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'message.group_created',
        entityType: 'conversation',
        entityId: conversation.id,
        requestId,
      });
      return conversation.id;
    });
    return this.get(actorId, created);
  }

  async updateGroup(actorId: string, conversationId: string, body: GroupDraft, requestId?: string) {
    const chosen = await this.chosenStudents(actorId, body.studentIds);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.conversation.findFirst({
        where: { id: conversationId, kind: 'GROUP', createdById: actorId },
      });
      if (!current) {
        throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      }
      await tx.conversation.update({
        where: { id: conversationId },
        data: { title: body.title.trim() },
      });
      await tx.conversationMember.deleteMany({
        where: { conversationId, userId: { notIn: [actorId, ...chosen] } },
      });
      await tx.conversationMember.createMany({
        data: chosen.map((userId) => ({ conversationId, userId })),
        skipDuplicates: true,
      });
      await this.audit.record(tx, {
        actorId,
        action: 'message.group_updated',
        entityType: 'conversation',
        entityId: conversationId,
        requestId,
      });
    });
    return this.get(actorId, conversationId);
  }

  async post(actorId: string, conversationId: string, body: MessageDraft, requestId?: string) {
    const conversation = await this.visibleConversation(actorId, conversationId);
    await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          authorId: actorId,
          body: body.body.trim(),
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: actorId } },
        data: { lastReadAt: message.createdAt },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'message.sent',
        entityType: 'message',
        entityId: message.id,
        requestId,
      });
    });
    void this.notice.notifyConversation({
      conversationId,
      actorId,
      thesisId: conversation.thesisId,
      preview: body.body.trim(),
    });
    return this.get(actorId, conversationId);
  }

  async postVoice(
    actorId: string,
    conversationId: string,
    file:
      | {
          path: string;
          originalName: string;
          declaredMime: string;
        }
      | undefined,
    durationMs: number | undefined,
    requestId?: string,
  ) {
    if (!file) {
      throw new AppException(400, 'FILE_TYPE_NOT_ALLOWED', 'Aucun fichier audio n’a été envoyé.');
    }
    const conversation = await this.visibleConversation(actorId, conversationId);
    const info = await stat(file.path);
    if (info.size <= 0 || info.size > VOICE_MAX_BYTES) {
      throw new AppException(413, 'FILE_TOO_LARGE', 'L’enregistrement dépasse 10 Mo.');
    }
    const mime = (file.declaredMime || '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!VOICE_MIMES.has(mime)) {
      throw new AppException(400, 'FILE_TYPE_NOT_ALLOWED', 'Format audio non accepté.');
    }
    const duration = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs ?? 0)) : 0;
    const objectId = randomUUID();
    const storageKey = `messages/${conversationId}/${objectId}`;
    await this.objects.ensureReady();
    await commitAfterUpload({
      put: () =>
        this.objects.putObject({
          key: storageKey,
          body: createReadStream(file.path),
          contentType: mime,
          contentLength: info.size,
          downloadName: file.originalName || 'voice.webm',
        }),
      insert: async () => {
        await this.prisma.$transaction(async (tx) => {
          const message = await tx.message.create({
            data: {
              conversationId,
              authorId: actorId,
              body: '',
              audioStorageKey: storageKey,
              audioMimeType: mime,
              audioDurationMs: duration || null,
              audioSizeBytes: BigInt(info.size),
            },
          });
          await tx.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
          await tx.conversationMember.update({
            where: { conversationId_userId: { conversationId, userId: actorId } },
            data: { lastReadAt: message.createdAt },
          });
          await this.audit.record(tx, {
            actorId,
            action: 'message.voice_sent',
            entityType: 'message',
            entityId: message.id,
            requestId,
          });
        });
      },
      remove: () => this.objects.deleteObject(storageKey),
    });
    void this.notice.notifyConversation({
      conversationId,
      actorId,
      thesisId: conversation.thesisId,
      preview: 'Message vocal',
    });
    return this.get(actorId, conversationId);
  }

  async openAudio(actorId: string, conversationId: string, messageId: string) {
    await this.visibleConversation(actorId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, deletedAt: null },
    });
    if (!message?.audioStorageKey) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    await this.objects.ensureReady();
    const object = await this.objects.getObjectStream(message.audioStorageKey);
    return {
      body: object.body,
      contentType: message.audioMimeType || object.contentType || 'audio/webm',
      contentLength: object.contentLength,
    };
  }

  async edit(
    actorId: string,
    conversationId: string,
    messageId: string,
    body: MessageUpdate,
    requestId?: string,
  ) {
    await this.ownedMessage(actorId, conversationId, messageId);
    await this.prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: messageId },
        data: { body: body.body.trim(), editedAt: new Date() },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'message.edited',
        entityType: 'message',
        entityId: messageId,
        requestId,
      });
    });
    return this.get(actorId, conversationId);
  }

  async removeMessage(
    actorId: string,
    conversationId: string,
    messageId: string,
    requestId?: string,
  ) {
    await this.ownedMessage(actorId, conversationId, messageId);
    await this.prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), body: '' },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'message.deleted',
        entityType: 'message',
        entityId: messageId,
        requestId,
      });
    });
    return this.get(actorId, conversationId);
  }

  async clear(actorId: string, conversationId: string, requestId?: string) {
    await this.visibleConversation(actorId, conversationId);
    await this.prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({ where: { conversationId } });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'conversation.cleared',
        entityType: 'conversation',
        entityId: conversationId,
        requestId,
      });
    });
    return this.get(actorId, conversationId);
  }

  async leave(actorId: string, conversationId: string, requestId?: string) {
    const conversation = await this.visibleConversation(actorId, conversationId);
    if (conversation.kind !== 'GROUP') {
      throw new AppException(400, 'BAD_REQUEST', 'Only a group can be left');
    }
    if (conversation.createdById === actorId) {
      throw new AppException(400, 'BAD_REQUEST', 'Delete the group instead of leaving it');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.conversationMember.delete({
        where: { conversationId_userId: { conversationId, userId: actorId } },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'conversation.left',
        entityType: 'conversation',
        entityId: conversationId,
        requestId,
      });
    });
    return { id: conversationId };
  }

  async removeConversation(actorId: string, conversationId: string, requestId?: string) {
    const conversation = await this.visibleConversation(actorId, conversationId);
    if (conversation.kind !== 'GROUP' || conversation.createdById !== actorId) {
      throw new AppException(403, 'FORBIDDEN', 'Only the group creator can delete it');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.conversation.delete({ where: { id: conversationId } });
      await this.audit.record(tx, {
        actorId,
        action: 'conversation.deleted',
        entityType: 'conversation',
        entityId: conversationId,
        requestId,
      });
    });
    return { id: conversationId };
  }

  private async ownedMessage(actorId: string, conversationId: string, messageId: string) {
    await this.visibleConversation(actorId, conversationId);
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, authorId: actorId, deletedAt: null },
    });
    if (!message) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return message;
  }

  private async ensureDirectConversations(actorId: string): Promise<void> {
    const placement = await this.placement(actorId);
    if (placement.kind === 'student' && placement.thesisId && placement.supervisorId) {
      const existing = await this.findDirect(actorId, placement.supervisorId);
      if (!existing) await this.ensureDirect(actorId, placement.thesisId);
      return;
    }
    if (placement.kind !== 'supervisor') return;
    for (const pair of await this.supervisorPairs(actorId)) {
      const existing = await this.findDirect(actorId, pair.studentId);
      if (!existing) await this.ensureDirect(actorId, pair.thesisId);
    }
  }

  private async placement(
    actorId: string,
  ): Promise<
    | { kind: 'student'; thesisId: string; supervisorId: string | null }
    | { kind: 'supervisor' }
    | { kind: 'none' }
  > {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: { in: ['DOCTORAL_STUDENT', 'SUPERVISOR'] } },
      include: { thesis: { select: { status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (memberships.some((member) => member.role === 'SUPERVISOR')) return { kind: 'supervisor' };
    const asStudent = memberships.filter((member) => member.role === 'DOCTORAL_STUDENT');
    const primary = asStudent.find((member) => member.thesis.status === 'ACTIVE') ?? asStudent[0];
    if (!primary) return { kind: 'none' };
    const supervisor = await this.prisma.thesisMembership.findFirst({
      where: {
        thesisId: primary.thesisId,
        role: 'SUPERVISOR',
        user: { disabledAt: null },
      },
    });
    return {
      kind: 'student',
      thesisId: primary.thesisId,
      supervisorId: supervisor?.userId ?? null,
    };
  }

  private async supervisorPairs(actorId: string) {
    const theses = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'SUPERVISOR' },
      select: { thesisId: true },
    });
    const students = await this.prisma.thesisMembership.findMany({
      where: {
        thesisId: { in: theses.map((row) => row.thesisId) },
        role: 'DOCTORAL_STUDENT',
        user: { disabledAt: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const pairs: { thesisId: string; studentId: string }[] = [];
    for (const student of students) {
      if (seen.has(student.userId)) continue;
      seen.add(student.userId);
      pairs.push({ thesisId: student.thesisId, studentId: student.userId });
    }
    return pairs;
  }

  private findDirect(actorId: string, otherId: string) {
    if (!otherId) return Promise.resolve(null);
    return this.prisma.conversation.findFirst({
      where: {
        kind: 'DIRECT',
        AND: [
          { members: { some: { userId: actorId } } },
          { members: { some: { userId: otherId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async ensureDirect(actorId: string, thesisId: string): Promise<void> {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: {
        thesisId,
        role: { in: ['DOCTORAL_STUDENT', 'SUPERVISOR'] },
        user: { disabledAt: null },
      },
    });
    const student = memberships.find((member) => member.role === 'DOCTORAL_STUDENT');
    const supervisor = memberships.find((member) => member.role === 'SUPERVISOR');
    if (!student || !supervisor) return;
    if (student.userId !== actorId && supervisor.userId !== actorId) return;

    const existing = await this.prisma.conversation.findUnique({ where: { thesisId } });
    if (existing) {
      await this.prisma.conversationMember.createMany({
        data: [student.userId, supervisor.userId].map((userId) => ({
          conversationId: existing.id,
          userId,
        })),
        skipDuplicates: true,
      });
      return;
    }

    try {
      await this.prisma.conversation.create({
        data: {
          kind: 'DIRECT',
          thesisId,
          createdById: actorId,
          members: {
            create: [{ userId: student.userId }, { userId: supervisor.userId }],
          },
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }

  private async supervisedStudents(actorId: string) {
    const supervised = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'SUPERVISOR' },
      select: { thesisId: true },
    });
    if (supervised.length === 0) return [];
    const students = await this.prisma.thesisMembership.findMany({
      where: {
        thesisId: { in: supervised.map((row) => row.thesisId) },
        role: 'DOCTORAL_STUDENT',
        user: { disabledAt: null },
      },
      include: { user: { select: personSelect } },
    });
    const unique = new Map<string, { userId: string; displayName: string }>();
    for (const student of students) {
      unique.set(student.userId, {
        userId: student.userId,
        displayName: personName(student.user),
      });
    }
    return [...unique.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }

  private async chosenStudents(actorId: string, studentIds: string[]): Promise<string[]> {
    const allowed = new Set(
      (await this.supervisedStudents(actorId)).map((student) => student.userId),
    );
    if (allowed.size === 0) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut créer un groupe');
    }
    const chosen = [...new Set(studentIds)];
    if (chosen.some((userId) => !allowed.has(userId))) {
      throw new AppException(400, 'BAD_REQUEST', 'Choisissez uniquement vos doctorants');
    }
    return chosen;
  }

  private async visibleConversation(actorId: string, conversationId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: actorId } },
      include: {
        conversation: {
          include: {
            thesis: { select: { title: true } },
            members: { include: { user: { select: personSelect } } },
          },
        },
      },
    });
    if (!membership) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return membership.conversation;
  }

  private toDetail(
    conversation: Prisma.ConversationGetPayload<{
      include: {
        thesis: { select: { title: true } };
        members: { include: { user: { select: typeof personSelect } } };
      };
    }>,
    messages: Array<
      Prisma.MessageGetPayload<{ include: { author: { select: typeof personSelect } } }>
    >,
  ) {
    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.title,
      thesisId: conversation.thesisId,
      thesisTitle: conversation.thesis?.title ?? null,
      createdById: conversation.createdById,
      participants: conversation.members.map((member) => ({
        userId: member.userId,
        displayName: personName(member.user),
        avatarUrl: resolveAvatarUrl(member.userId, member.user.profile?.avatarUrl),
      })),
      messages: messages.map((message) => ({
        id: message.id,
        authorId: message.authorId,
        authorName: personName(message.author),
        body: message.deletedAt ? '' : message.body,
        audioUrl:
          !message.deletedAt && message.audioStorageKey
            ? `/api/v1/messages/conversations/${conversation.id}/messages/${message.id}/audio`
            : null,
        audioDurationMs: message.deletedAt ? null : (message.audioDurationMs ?? null),
        createdAt: message.createdAt.toISOString(),
        editedAt: message.editedAt?.toISOString() ?? null,
        deleted: Boolean(message.deletedAt),
      })),
    };
  }
}

function personName(user: Person): string {
  const name = user.profile?.displayName.trim() ?? '';
  return (name || user.email).slice(0, 160);
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
