import { Injectable } from '@nestjs/common';
import type { Meeting, MembershipRole, Prisma } from '@prisma/client';
import type {
  cancelMeetingSchema,
  createMeetingSchema,
  holdMeetingSchema,
  requestMeetingSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  canCancelMeeting,
  canConfirmRequest,
  canCreateMeeting,
  canManageMeeting,
  canRequestMeeting,
  canReviseRequest,
  canViewMeeting,
} from './meeting-policy';
import { MeetingNotice } from './meeting-notice';
import { splitMeetings, type MeetingStatus } from './meeting-rules';
import { videoRoomUrl } from './meeting-video';

const READ_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

type Draft = z.infer<typeof createMeetingSchema>;
type RequestDraft = z.infer<typeof requestMeetingSchema>;
type HoldBody = z.infer<typeof holdMeetingSchema>;
type CancelBody = z.infer<typeof cancelMeetingSchema>;

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
    private readonly audit: AuditService,
    private readonly notice: MeetingNotice,
  ) {}

  async list(actorId: string, thesisId: string) {
    await this.memberRole(actorId, thesisId);
    const rows = await this.prisma.meeting.findMany({ where: { thesisId } });
    const today = new Date().toISOString().slice(0, 10);
    return splitMeetings(
      rows.map((row) => this.toDetail(row)),
      today,
    );
  }

  async get(actorId: string, thesisId: string, meetingId: string) {
    await this.memberRole(actorId, thesisId);
    return this.toDetail(await this.findInThesis(thesisId, meetingId));
  }

  async create(actorId: string, thesisId: string, body: Draft, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId, true);
    if (!canCreateMeeting(role)) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut planifier une réunion');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          thesisId,
          createdById: actorId,
          title: body.title.trim(),
          scheduledOn: parseDay(body.scheduledOn),
          ...placeData(body),
          agenda: blankToNull(body.agenda),
          status: 'PLANNED',
        },
      });
      const ready = await this.withVideoRoom(tx, meeting);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.created',
        entityType: 'meeting',
        entityId: ready.id,
        requestId,
      });
      return ready;
    });
    await this.notice.planned(created);
    return this.toDetail(created);
  }

  async request(actorId: string, thesisId: string, body: RequestDraft, requestId?: string) {
    const role = await this.memberRole(actorId, thesisId, true);
    if (!canRequestMeeting(role)) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un doctorant peut demander une réunion');
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const meeting = await tx.meeting.create({
        data: {
          thesisId,
          createdById: actorId,
          title: body.title.trim(),
          scheduledOn: null,
          mode: null,
          location: null,
          meetingUrl: null,
          agenda: blankToNull(body.agenda),
          status: 'REQUESTED',
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.requested',
        entityType: 'meeting',
        entityId: meeting.id,
        requestId,
      });
      return meeting;
    });
    await this.notice.requested(created);
    return this.toDetail(created);
  }

  async reviseRequest(
    actorId: string,
    thesisId: string,
    meetingId: string,
    body: RequestDraft,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, thesisId, meetingId);
      if (!canReviseRequest(role, current.status)) {
        throw new AppException(
          role === 'DOCTORAL_STUDENT' ? 400 : 403,
          role === 'DOCTORAL_STUDENT' ? 'BAD_REQUEST' : 'FORBIDDEN',
          role === 'DOCTORAL_STUDENT'
            ? 'Seule une demande en attente peut encore être modifiée'
            : 'Seul un doctorant peut modifier sa demande',
        );
      }
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          title: body.title.trim(),
          agenda: blankToNull(body.agenda),
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.request_updated',
        entityType: 'meeting',
        entityId: meeting.id,
        requestId,
      });
      return meeting;
    });
    return this.toDetail(updated);
  }

  async confirm(
    actorId: string,
    thesisId: string,
    meetingId: string,
    body: Draft,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, thesisId, meetingId);
      if (!canConfirmRequest(role, current.status)) {
        throw new AppException(
          role === 'SUPERVISOR' ? 400 : 403,
          role === 'SUPERVISOR' ? 'BAD_REQUEST' : 'FORBIDDEN',
          role === 'SUPERVISOR'
            ? 'Seule une demande en attente peut être confirmée'
            : 'Seul un encadrant peut confirmer une demande',
        );
      }
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          title: body.title.trim(),
          scheduledOn: parseDay(body.scheduledOn),
          ...placeData(body),
          agenda: blankToNull(body.agenda),
          status: 'PLANNED',
          cancelReason: null,
          cancelledAt: null,
          reminderSentAt: null,
        },
      });
      const ready = await this.withVideoRoom(tx, meeting);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.confirmed',
        entityType: 'meeting',
        entityId: ready.id,
        requestId,
      });
      return ready;
    });
    await this.notice.planned(updated);
    return this.toDetail(updated);
  }

  async update(
    actorId: string,
    thesisId: string,
    meetingId: string,
    body: Draft,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, thesisId, meetingId);
      if (!canManageMeeting(role, current.status)) {
        throw this.manageError(role);
      }
      const stored = await tx.meeting.findFirst({ where: { id: meetingId, thesisId } });
      if (!stored) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          title: body.title.trim(),
          scheduledOn: parseDay(body.scheduledOn),
          ...placeData(body),
          agenda: blankToNull(body.agenda),
          ...(formatDay(stored.scheduledOn) === body.scheduledOn ? {} : { reminderSentAt: null }),
        },
      });
      const ready = await this.withVideoRoom(tx, meeting);
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.updated',
        entityType: 'meeting',
        entityId: ready.id,
        requestId,
      });
      return ready;
    });
    await this.notice.updated(updated);
    return this.toDetail(updated);
  }

  async hold(
    actorId: string,
    thesisId: string,
    meetingId: string,
    body: HoldBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, thesisId, meetingId);
      if (!canManageMeeting(role, current.status)) throw this.manageError(role);
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'HELD',
          minutes: body.minutes.trim(),
          heldAt: now,
          cancelledAt: null,
          cancelReason: null,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.held',
        entityType: 'meeting',
        entityId: meeting.id,
        requestId,
      });
      return meeting;
    });
    return this.toDetail(updated);
  }

  async cancel(
    actorId: string,
    thesisId: string,
    meetingId: string,
    body: CancelBody,
    requestId?: string,
  ) {
    const role = await this.memberRole(actorId, thesisId, true);
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await this.lock(tx, thesisId, meetingId);
      if (!canCancelMeeting(role, current.status)) throw this.manageError(role);
      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'CANCELLED',
          cancelReason: blankToNull(body.reason),
          cancelledAt: now,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'meeting.cancelled',
        entityType: 'meeting',
        entityId: meeting.id,
        requestId,
      });
      return meeting;
    });
    await this.notice.cancelled(updated);
    return this.toDetail(updated);
  }

  private async withVideoRoom(tx: Prisma.TransactionClient, meeting: Meeting): Promise<Meeting> {
    if (meeting.mode !== 'ONLINE' || meeting.meetingUrl) return meeting;
    return tx.meeting.update({
      where: { id: meeting.id },
      data: { meetingUrl: videoRoomUrl(meeting.id) },
    });
  }

  private manageError(role: MembershipRole): AppException {
    if (role !== 'SUPERVISOR') {
      return new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut modifier une réunion');
    }
    return new AppException(
      400,
      'BAD_REQUEST',
      'Seules les réunions planifiées peuvent encore être modifiées',
    );
  }

  private async memberRole(
    actorId: string,
    thesisId: string,
    write = false,
  ): Promise<MembershipRole> {
    await this.access.assertCanAccess({ actorId, thesisId, allowedRoles: READ_ROLES, write });
    const membership = await this.prisma.thesisMembership.findUnique({
      where: { thesisId_userId: { thesisId, userId: actorId } },
    });
    if (!membership || !canViewMeeting(membership.role)) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    return membership.role;
  }

  private async findInThesis(thesisId: string, meetingId: string): Promise<Meeting> {
    const row = await this.prisma.meeting.findFirst({ where: { id: meetingId, thesisId } });
    if (!row) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return row;
  }

  private async lock(tx: Prisma.TransactionClient, thesisId: string, meetingId: string) {
    const rows = await tx.$queryRaw<Array<{ status: MeetingStatus }>>`
      SELECT status FROM meetings WHERE id = ${meetingId}::uuid AND thesis_id = ${thesisId}::uuid FOR UPDATE
    `;
    const locked = rows[0];
    if (!locked) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    return locked;
  }

  private toDetail(row: Meeting) {
    const scheduledOn = formatDay(row.scheduledOn);
    if (row.status !== 'REQUESTED' && !scheduledOn) {
      throw new AppException(500, 'INTERNAL_ERROR', 'Meeting date is missing');
    }
    return {
      id: row.id,
      thesisId: row.thesisId,
      title: row.title,
      scheduledOn,
      mode: row.mode,
      status: row.status,
      location: row.location,
      meetingUrl: row.meetingUrl,
      agenda: row.agenda,
      minutes: row.minutes,
      cancelReason: row.cancelReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function placeData(body: { mode: 'ONLINE' | 'IN_PERSON'; location?: string; meetingUrl?: string }) {
  if (body.mode === 'ONLINE') {
    return {
      mode: 'ONLINE' as const,
      meetingUrl: blankToNull(body.meetingUrl),
      location: null,
    };
  }
  return {
    mode: 'IN_PERSON' as const,
    location: blankToNull(body.location),
    meetingUrl: null,
  };
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
