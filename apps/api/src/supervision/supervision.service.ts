import { Injectable } from '@nestjs/common';
import { formatDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import {
  ACTIVITY_ACTIONS,
  fileActivityMessage,
  toActivity,
  versionActivityMessage,
} from '../dashboard/activity';
import { assessProgress, workProgressPercentage } from '../dashboard/progress';
import { summarizeDeliverables } from '../deliverables/deliverable-rules';
import { ThesisAccessService } from '../common/thesis-access/thesis-access.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { summarizeObjectives, supervisionSummary } from '../objectives/objective-rules';
import {
  presentAcademicProfile,
  resolveAvatarUrl,
  toAcademicProfile,
} from '../profile/profile.service';

/**
 * The principal doctoral student is the DOCTORAL_STUDENT membership with the
 * earliest createdAt. Equal timestamps break the tie by userId.
 * This is the student recorded when the thesis was created, not an arbitrary row.
 */
@Injectable()
export class SupervisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ThesisAccessService,
  ) {}

  async list(actorId: string) {
    const now = new Date();
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'SUPERVISOR' },
      include: {
        thesis: {
          include: {
            memberships: {
              include: { user: { include: { profile: true } } },
              orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
            },
            objectives: {
              select: { id: true, title: true, status: true, dueDate: true, progress: true },
            },
            deliverables: {
              select: {
                id: true,
                title: true,
                status: true,
                dueDate: true,
                submittedAt: true,
                versions: {
                  orderBy: { versionNumber: 'desc' },
                  take: 1,
                  select: { versionNumber: true },
                },
              },
            },
            meetings: {
              where: {
                status: 'PLANNED',
                scheduledOn: { gte: new Date(now.toISOString().slice(0, 10)) },
              },
              orderBy: { scheduledOn: 'asc' },
              take: 20,
            },
            auditLogs: {
              where: { action: { in: [...ACTIVITY_ACTIONS] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const coverages = await Promise.all(
      memberships.map((membership) => this.access.coverageForThesis(membership.thesis.id)),
    );
    return {
      theses: memberships.map((membership, index) => {
        const students = membership.thesis.memberships.flatMap((item) => {
          if (item.role !== 'DOCTORAL_STUDENT' || !item.user.profile) return [];
          return [
            {
              id: item.userId,
              givenName: item.user.profile.givenName,
              familyName: item.user.profile.familyName,
              avatarUrl: resolveAvatarUrl(item.userId, item.user.profile.avatarUrl),
              institution: item.user.profile.institution,
              specialty: item.user.profile.specialty,
            },
          ];
        });
        const supervisors = membership.thesis.memberships.flatMap((item) => {
          if (item.role !== 'SUPERVISOR' || !item.user.profile) return [];
          return [{ displayName: item.user.profile.displayName }];
        });
        const today = formatDay(now) ?? '';
        const counts = summarizeObjectives(membership.thesis.objectives, now);
        const openDeliverables = membership.thesis.deliverables.filter(
          (item) => item.status !== 'CANCELLED',
        );
        const defenseOn = formatDay(membership.thesis.expectedDefenseOn);
        const datedWork = [
          ...membership.thesis.objectives.flatMap((item) => {
            const occursOn = formatDay(item.dueDate);
            return occursOn && item.status !== 'COMPLETED' && item.status !== 'CANCELLED'
              ? [{ id: item.id, title: item.title, occursOn, kind: 'OBJECTIVE' as const }]
              : [];
          }),
          ...openDeliverables.flatMap((item) => {
            const occursOn = formatDay(item.dueDate);
            return occursOn && item.status !== 'VALIDATED'
              ? [{ id: item.id, title: item.title, occursOn, kind: 'DELIVERABLE' as const }]
              : [];
          }),
          ...membership.thesis.meetings.flatMap((item) => {
            const occursOn = formatDay(item.scheduledOn);
            return occursOn && occursOn >= today && item.status === 'PLANNED'
              ? [{ id: item.id, title: item.title, occursOn, kind: 'MEETING' as const }]
              : [];
          }),
          ...(defenseOn
            ? [
                {
                  id: membership.thesis.id,
                  title: 'Soutenance prévue',
                  occursOn: defenseOn,
                  kind: 'EXPECTED_DEFENSE' as const,
                },
              ]
            : []),
        ].sort((left, right) => left.occursOn.localeCompare(right.occursOn));
        return {
          thesisId: membership.thesis.id,
          title: membership.thesis.title,
          status: membership.thesis.status,
          discipline: membership.thesis.discipline,
          institution: membership.thesis.institution,
          startedOn: formatDay(membership.thesis.startedOn),
          expectedDefenseOn: formatDay(membership.thesis.expectedDefenseOn),
          durationYears: durationYears(
            membership.thesis.startedOn,
            membership.thesis.expectedDefenseOn,
          ),
          progressPercentage: workProgressPercentage(membership.thesis.objectives),
          nextDeadline: datedWork[0] ?? null,
          lastActivityAt: membership.thesis.auditLogs[0]?.createdAt.toISOString() ?? null,
          deliverableCount: openDeliverables.length,
          pendingValidationCount: openDeliverables.filter((item) => item.status === 'SUBMITTED')
            .length,
          pendingDeliverables: openDeliverables
            .filter((item) => item.status === 'SUBMITTED')
            .slice(0, 20)
            .map((item) => ({
              id: item.id,
              title: item.title,
              latestVersionNumber: item.versions[0]?.versionNumber ?? null,
              submittedAt: item.submittedAt?.toISOString() ?? null,
            })),
          supervisors,
          meetings: membership.thesis.meetings
            .flatMap((meeting) => {
              const scheduledOn = formatDay(meeting.scheduledOn);
              if (!scheduledOn || scheduledOn < today || meeting.status !== 'PLANNED') return [];
              return [{ id: meeting.id, title: meeting.title, scheduledOn }];
            })
            .slice(0, 8),
          doctoralStudent: students[0] ?? null,
          doctoralStudents: students,
          objectiveSummary: supervisionSummary(counts),
          coverage: coverages[index] ?? {
            writable: false,
            source: 'none' as const,
            expiresAt: null,
          },
        };
      }),
    };
  }

  async space(actorId: string, thesisId: string) {
    const thesis = await this.prisma.thesis.findFirst({
      where: {
        id: thesisId,
        memberships: { some: { userId: actorId, role: 'SUPERVISOR' } },
      },
      include: {
        memberships: {
          include: { user: { include: { profile: true } } },
          orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
        },
        objectives: {
          select: { id: true, title: true, status: true, dueDate: true, progress: true },
        },
        deliverables: { select: { id: true, title: true, status: true, dueDate: true } },
      },
    });
    if (!thesis) throw new AppException(404, 'NOT_FOUND', 'Resource not found');

    const student = thesis.memberships.find(
      (item) => item.role === 'DOCTORAL_STUDENT' && item.user.profile && !item.user.disabledAt,
    );
    if (!student?.user.profile) {
      throw new AppException(404, 'NOT_FOUND', 'Resource not found');
    }
    const supervisors = thesis.memberships.filter(
      (item) => item.role === 'SUPERVISOR' && item.user.profile != null,
    );
    const now = new Date();
    const progress = assessProgress({
      hasThesis: true,
      thesisStatus: thesis.status,
      discipline: Boolean(thesis.discipline),
      institution: Boolean(thesis.institution),
      startedOn: thesis.startedOn != null,
      expectedDefenseOn: thesis.expectedDefenseOn != null,
      hasSupervisor: supervisors.length > 0,
    });
    const openTasks = await this.prisma.task.findMany({
      where: {
        dueDate: { not: null },
        status: { in: ['TODO', 'IN_PROGRESS'] },
        objective: { thesisId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
      select: { id: true, title: true, dueDate: true },
    });
    const logs = await this.prisma.auditLog.findMany({
      where: { thesisId, action: { in: [...ACTIVITY_ACTIONS] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { action: true, createdAt: true, entityId: true },
    });
    const versionIds = logs.flatMap((entry) =>
      entry.action === 'deliverable.version_created' && entry.entityId ? [entry.entityId] : [],
    );
    const versionRows =
      versionIds.length === 0
        ? []
        : await this.prisma.deliverableVersion.findMany({
            where: { id: { in: versionIds } },
            select: { id: true, versionNumber: true, deliverable: { select: { title: true } } },
          });
    const versionMessages = new Map(
      versionRows.map((row) => [
        row.id,
        versionActivityMessage(row.versionNumber, row.deliverable.title),
      ]),
    );
    const fileIds = logs.flatMap((entry) =>
      entry.action === 'deliverable.file_uploaded' && entry.entityId ? [entry.entityId] : [],
    );
    const fileRows =
      fileIds.length === 0
        ? []
        : await this.prisma.storedFile.findMany({
            where: { id: { in: fileIds } },
            select: {
              id: true,
              version: {
                select: { versionNumber: true, deliverable: { select: { title: true } } },
              },
            },
          });
    const fileMessages = new Map(
      fileRows.map((row) => [
        row.id,
        fileActivityMessage(row.version.versionNumber, row.version.deliverable.title),
      ]),
    );
    const objectiveDeadlines = thesis.objectives.flatMap((item) => {
      if (!item.dueDate || item.status === 'CANCELLED' || item.status === 'COMPLETED') return [];
      const occursOn = formatDay(item.dueDate);
      return occursOn
        ? [{ id: item.id, kind: 'OBJECTIVE' as const, title: item.title, occursOn }]
        : [];
    });
    const taskDeadlines = openTasks.flatMap((item) => {
      const occursOn = formatDay(item.dueDate);
      return occursOn ? [{ id: item.id, kind: 'TASK' as const, title: item.title, occursOn }] : [];
    });
    const deliverableDeadlines = thesis.deliverables
      .flatMap((item) =>
        item.dueDate && item.status !== 'VALIDATED' && item.status !== 'CANCELLED'
          ? [{ id: item.id, title: item.title, dueDate: item.dueDate }]
          : [],
      )
      .sort((left, right) => (left.dueDate.getTime() < right.dueDate.getTime() ? -1 : 1))
      .slice(0, 8)
      .flatMap((item) => {
        const occursOn = formatDay(item.dueDate);
        return occursOn
          ? [{ id: item.id, kind: 'DELIVERABLE' as const, title: item.title, occursOn }]
          : [];
      });
    const defenseOn = formatDay(thesis.expectedDefenseOn);

    return {
      profile: presentAcademicProfile(
        toAcademicProfile(student.user.profile),
        student.userId,
        false,
      ),
      thesis: {
        id: thesis.id,
        title: thesis.title,
        status: thesis.status,
        discipline: thesis.discipline,
        institution: thesis.institution,
        startedOn: formatDay(thesis.startedOn),
        expectedDefenseOn: defenseOn,
        supervisors: supervisors.flatMap((item) =>
          item.user.profile ? [{ displayName: item.user.profile.displayName }] : [],
        ),
      },
      progress,
      objectives: summarizeObjectives(thesis.objectives, now),
      deliverables: summarizeDeliverables(thesis.deliverables, now),
      workProgress: { percentage: workProgressPercentage(thesis.objectives) },
      upcomingDeadlines: [
        ...objectiveDeadlines,
        ...taskDeadlines,
        ...deliverableDeadlines,
        ...(defenseOn
          ? [
              {
                id: thesis.id,
                kind: 'EXPECTED_DEFENSE' as const,
                title: 'Soutenance prévue',
                occursOn: defenseOn,
              },
            ]
          : []),
      ]
        .sort((left, right) => (left.occursOn < right.occursOn ? -1 : 1))
        .slice(0, 8),
      recentActivity: logs.flatMap((entry) => {
        const activity = toActivity(entry);
        if (!activity) return [];
        const message = entry.entityId
          ? (versionMessages.get(entry.entityId) ?? fileMessages.get(entry.entityId))
          : undefined;
        return [message ? { ...activity, message } : activity];
      }),
    };
  }
}

function durationYears(start: Date | null, end: Date | null): number | null {
  if (!start || !end || end.getTime() < start.getTime()) return null;
  const years = Math.round((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.min(20, Math.max(0, years));
}
