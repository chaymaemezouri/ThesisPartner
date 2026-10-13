import { Injectable } from '@nestjs/common';
import type { PublicationStatus } from '@prisma/client';
import type { evaluationInputSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { formatDay, parseDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { workProgressPercentage } from '../dashboard/progress';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

type EvaluationBody = z.infer<typeof evaluationInputSchema>;

const DECISION_ACTIONS = [
  'deliverable.validated',
  'deliverable.changes_requested',
  'objective.completion_approved',
  'objective.changes_requested',
  'meeting.confirmed',
  'meeting.cancelled',
  'meeting.held',
  'remark.created',
  'remark.closed',
  'evaluation.recorded',
  'publication.status_updated',
] as const;

@Injectable()
export class SupervisionDeskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async desk(actorId: string) {
    const since = new Date(Date.now() - 21 * 86_400_000);
    const today = formatDay(new Date()) ?? '';
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'SUPERVISOR' },
      include: {
        thesis: {
          include: {
            memberships: {
              include: { user: { include: { profile: true, publications: true } } },
              orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
            },
            objectives: {
              orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
              take: 40,
            },
            deliverables: { take: 40 },
            meetings: { orderBy: { scheduledOn: 'desc' }, take: 40 },
            remarks: {
              where: {
                replies: { some: { createdAt: { gte: since }, authorId: { not: actorId } } },
              },
              select: {
                id: true,
                title: true,
                replies: {
                  where: { createdAt: { gte: since }, authorId: { not: actorId } },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
              take: 8,
            },
            evaluations: { orderBy: { evaluatedOn: 'desc' }, take: 12 },
            auditLogs: {
              where: { action: { in: [...DECISION_ACTIONS] } },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const notifications: DeskNotification[] = [];
    const schedule: DeskDate[] = [];
    const publications: DeskPublication[] = [];
    const decisions: DeskDecision[] = [];
    const plans: DeskPlan[] = [];
    const evaluations: DeskEvaluation[] = [];

    for (const membership of memberships) {
      const thesis = membership.thesis;
      const student = thesis.memberships.find((item) => item.role === 'DOCTORAL_STUDENT');
      const studentName = student?.user.profile
        ? `${student.user.profile.givenName} ${student.user.profile.familyName}`
        : 'Doctorant';

      if (thesis.expectedDefenseOn) {
        const date = formatDay(thesis.expectedDefenseOn);
        if (date) {
          schedule.push({
            id: `defense-${thesis.id}`,
            kind: 'DEFENSE',
            thesisId: thesis.id,
            studentName,
            title: thesis.title,
            date,
          });
        }
      }

      for (const item of thesis.deliverables) {
        if (item.status === 'SUBMITTED') {
          notifications.push({
            id: `deliverable-${item.id}`,
            kind: 'DELIVERABLE',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date: formatDay(item.submittedAt),
          });
        }
        const due = formatDay(item.dueDate);
        if (due && item.status !== 'CANCELLED' && item.status !== 'VALIDATED') {
          schedule.push({
            id: `deliverable-${item.id}`,
            kind: 'DELIVERABLE',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date: due,
          });
        }
      }

      for (const item of thesis.objectives) {
        const due = formatDay(item.dueDate);
        if (
          due &&
          due < today &&
          item.status !== 'COMPLETED' &&
          item.status !== 'CANCELLED'
        ) {
          notifications.push({
            id: `overdue-${item.id}`,
            kind: 'OVERDUE',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date: due,
          });
        }
        if (due && item.status !== 'CANCELLED') {
          schedule.push({
            id: `objective-${item.id}`,
            kind: 'OBJECTIVE',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date: due,
          });
        }
      }

      for (const item of thesis.meetings) {
        const date = formatDay(item.scheduledOn);
        if (item.status === 'REQUESTED') {
          notifications.push({
            id: `meeting-${item.id}`,
            kind: 'MEETING',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date,
          });
        }
        if (date && item.status !== 'CANCELLED') {
          schedule.push({
            id: `meeting-${item.id}`,
            kind: 'MEETING',
            thesisId: thesis.id,
            studentName,
            title: item.title,
            date,
          });
        }
      }

      for (const item of thesis.remarks) {
        const reply = item.replies[0];
        if (!reply) continue;
        notifications.push({
          id: `remark-${reply.id}`,
          kind: 'REMARK',
          thesisId: thesis.id,
          studentName,
          title: item.title,
          date: formatDay(reply.createdAt),
        });
      }

      if (student) {
        for (const item of student.user.publications) {
          publications.push({
            id: item.id,
            thesisId: thesis.id,
            studentName,
            title: item.title,
            venue: item.venue,
            year: item.year,
            kind: item.kind,
            status: item.status,
          });
        }
      }

      for (const item of thesis.auditLogs) {
        decisions.push({
          id: item.id,
          thesisId: thesis.id,
          studentName,
          action: item.action,
          createdAt: item.createdAt.toISOString(),
        });
      }

      plans.push({
        thesisId: thesis.id,
        studentName,
        progressPercentage: workProgressPercentage(thesis.objectives),
        phases: thesis.objectives
          .filter((item) => item.status !== 'CANCELLED')
          .map((item) => ({
            id: item.id,
            title: item.title,
            startDate: formatDay(item.startDate),
            dueDate: formatDay(item.dueDate),
            status: item.status,
            progress: item.progress,
          })),
      });

      for (const item of thesis.evaluations) {
        const evaluatedOn = formatDay(item.evaluatedOn);
        if (!evaluatedOn) continue;
        evaluations.push({
          id: item.id,
          thesisId: thesis.id,
          studentName,
          evaluatedOn,
          quality: item.quality,
          autonomy: item.autonomy,
          methodology: item.methodology,
          advancement: item.advancement,
          comment: item.comment,
        });
      }
    }

    notifications.sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''));
    schedule.sort((left, right) => left.date.localeCompare(right.date));
    decisions.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    publications.sort((left, right) => right.year - left.year || left.studentName.localeCompare(right.studentName));

    return {
      notifications: notifications.slice(0, 80),
      schedule: schedule.slice(0, 300),
      publications: publications.slice(0, 200),
      decisions: decisions.slice(0, 100),
      plans,
      evaluations: evaluations.slice(0, 200),
    };
  }

  async addEvaluation(actorId: string, thesisId: string, body: EvaluationBody, requestId?: string) {
    await this.requireSupervisor(actorId, thesisId);
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.periodicEvaluation.create({
        data: {
          thesisId,
          authorId: actorId,
          evaluatedOn: parseDay(body.evaluatedOn),
          quality: body.quality,
          autonomy: body.autonomy,
          methodology: body.methodology,
          advancement: body.advancement,
          comment: body.comment?.trim() || null,
        },
      });
      await this.audit.record(tx, {
        actorId,
        thesisId,
        action: 'evaluation.recorded',
        entityType: 'evaluation',
        entityId: row.id,
        requestId,
      });
      return row;
    });
    return { id: created.id };
  }

  async setPublicationStatus(
    actorId: string,
    publicationId: string,
    status: PublicationStatus,
    requestId?: string,
  ) {
    const publication = await this.prisma.publication.findUnique({ where: { id: publicationId } });
    if (!publication) throw new AppException(404, 'NOT_FOUND', 'Publication introuvable');
    const link = await this.prisma.thesisMembership.findFirst({
      where: {
        userId: publication.userId,
        role: 'DOCTORAL_STUDENT',
        thesis: { memberships: { some: { userId: actorId, role: 'SUPERVISOR' } } },
      },
    });
    if (!link) throw new AppException(403, 'FORBIDDEN', 'Seul l’encadrant peut suivre cette publication');
    await this.prisma.$transaction(async (tx) => {
      await tx.publication.update({ where: { id: publicationId }, data: { status } });
      await this.audit.record(tx, {
        actorId,
        thesisId: link.thesisId,
        action: 'publication.status_updated',
        entityType: 'publication',
        entityId: publicationId,
        requestId,
        metadata: { status },
      });
    });
    return { id: publicationId, status };
  }

  private async requireSupervisor(actorId: string, thesisId: string) {
    const membership = await this.prisma.thesisMembership.findFirst({
      where: { userId: actorId, thesisId, role: 'SUPERVISOR' },
    });
    if (!membership) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant de cette thèse peut l’évaluer');
    }
  }
}

type DeskNotification = {
  id: string;
  kind: 'DELIVERABLE' | 'OVERDUE' | 'MEETING' | 'REMARK';
  thesisId: string;
  studentName: string;
  title: string;
  date: string | null;
};

type DeskDate = {
  id: string;
  kind: 'DEFENSE' | 'OBJECTIVE' | 'DELIVERABLE' | 'MEETING';
  thesisId: string;
  studentName: string;
  title: string;
  date: string;
};

type DeskPublication = {
  id: string;
  thesisId: string;
  studentName: string;
  title: string;
  venue: string;
  year: number;
  kind: 'ARTICLE' | 'CONFERENCE';
  status: PublicationStatus;
};

type DeskDecision = {
  id: string;
  thesisId: string;
  studentName: string;
  action: string;
  createdAt: string;
};

type DeskPlan = {
  thesisId: string;
  studentName: string;
  progressPercentage: number;
  phases: {
    id: string;
    title: string;
    startDate: string | null;
    dueDate: string | null;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    progress: number;
  }[];
};

type DeskEvaluation = {
  id: string;
  thesisId: string;
  studentName: string;
  evaluatedOn: string;
  quality: number;
  autonomy: number;
  methodology: number;
  advancement: number;
  comment: string | null;
};
