import { Inject, Injectable } from '@nestjs/common';
import type { Meeting, MembershipRole } from '@prisma/client';
import { AuthMailer } from '../auth/auth-mailer';
import { formatDay, parseDay } from '../common/dates';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { nextDay } from './meeting-video';

type NoticeKind = 'requested' | 'planned' | 'updated' | 'cancelled' | 'reminder';

const PARTY_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR'] as const;

@Injectable()
export class MeetingNotice {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: AuthMailer,
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  requested(meeting: Meeting): Promise<boolean> {
    return this.deliver(meeting, 'requested');
  }

  planned(meeting: Meeting): Promise<boolean> {
    return this.deliver(meeting, 'planned');
  }

  updated(meeting: Meeting): Promise<boolean> {
    return this.deliver(meeting, 'updated');
  }

  cancelled(meeting: Meeting): Promise<boolean> {
    return this.deliver(meeting, 'cancelled');
  }

  async remindDue(now = new Date()): Promise<void> {
    const tomorrow = parseDay(nextDay(now.toISOString().slice(0, 10)));
    const due = await this.prisma.meeting.findMany({
      where: { status: 'PLANNED', reminderSentAt: null, scheduledOn: tomorrow },
    });
    for (const meeting of due) {
      const claimed = await this.prisma.meeting.updateMany({
        where: { id: meeting.id, status: 'PLANNED', reminderSentAt: null },
        data: { reminderSentAt: now },
      });
      if (claimed.count === 0) continue;
      const sent = await this.deliver(meeting, 'reminder');
      if (!sent) {
        await this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { reminderSentAt: null },
        });
      }
    }
  }

  private async deliver(meeting: Meeting, kind: NoticeKind): Promise<boolean> {
    const roles = kind === 'requested' ? (['SUPERVISOR'] as const) : PARTY_ROLES;
    const members = await this.prisma.thesisMembership.findMany({
      where: {
        thesisId: meeting.thesisId,
        role: { in: [...roles] },
        user: { disabledAt: null },
      },
      select: { role: true, user: { select: { email: true } } },
    });
    if (members.length === 0) return true;

    let sent = 0;
    for (const member of members) {
      const mail = this.compose(meeting, kind, member.role);
      try {
        await this.mailer.send({ to: member.user.email, subject: mail.subject, text: mail.text });
        sent += 1;
      } catch {
        this.logger.write({
          level: 'error',
          msg: 'meeting.mail.failed',
          meetingId: meeting.id,
        });
      }
    }
    return sent > 0;
  }

  private compose(
    meeting: Meeting,
    kind: NoticeKind,
    role: MembershipRole,
  ): { subject: string; text: string } {
    const subject = `${SUBJECT[kind]}: ${meeting.title}`;
    const lines = [subject, '', `Date: ${when(meeting)}`, `Mode: ${modeLabel(meeting)}`];
    if (meeting.meetingUrl) lines.push(`Video: ${meeting.meetingUrl}`);
    if (meeting.location) lines.push(`Location: ${meeting.location}`);
    if (meeting.agenda?.trim()) lines.push('', 'Agenda:', meeting.agenda.trim());
    if (kind === 'cancelled') {
      lines.push('', `Reason: ${meeting.cancelReason?.trim() || 'No reason provided.'}`);
    }
    lines.push('', 'Open the meeting:', this.pageUrl(meeting, role));
    return { subject, text: lines.join('\n') };
  }

  private pageUrl(meeting: Meeting, role: MembershipRole): string {
    const root = this.env.APP_URL.replace(/\/$/, '');
    const path =
      role === 'SUPERVISOR'
        ? `/encadrement/${meeting.thesisId}/reunions/${meeting.id}`
        : `/reunions/${meeting.id}`;
    return `${root}${path}`;
  }
}

const SUBJECT: Record<NoticeKind, string> = {
  requested: 'Meeting request',
  planned: 'Meeting scheduled',
  updated: 'Meeting updated',
  cancelled: 'Meeting cancelled',
  reminder: 'Reminder: meeting tomorrow',
};

function when(meeting: Meeting): string {
  const day = formatDay(meeting.scheduledOn);
  if (!day) return 'to be set by the supervisor';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    parseDay(day),
  );
}

function modeLabel(meeting: Meeting): string {
  if (meeting.mode === 'ONLINE') return 'Online';
  if (meeting.mode === 'IN_PERSON') return 'In person';
  return 'to be defined';
}
