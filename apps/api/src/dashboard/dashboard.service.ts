import { Injectable } from '@nestjs/common';
import { daysSince, formatDay } from '../common/dates';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { summarizeDeliverables } from '../deliverables/deliverable-rules';
import { summarizeObjectives } from '../objectives/objective-rules';
import {
  ACTIVITY_ACTIONS,
  fileActivityMessage,
  toActivity,
  versionActivityMessage,
} from './activity';
import { assessProgress, workProgressPercentage } from './progress';
import { profileCompletion } from '../profile/completion';
import { presentAcademicProfile, toAcademicProfile } from '../profile/profile.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        memberships: {
          where: { role: 'DOCTORAL_STUDENT' },
          include: {
            thesis: {
              include: {
                memberships: {
                  include: { user: { include: { profile: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user || user.disabledAt || !user.profile) {
      throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const membership =
      user.memberships.find((item) => item.thesis.status === 'ACTIVE') ??
      user.memberships[0] ??
      null;
    const thesis = membership?.thesis ?? null;
    const supervisors =
      thesis?.memberships.filter(
        (item) => item.role === 'SUPERVISOR' && item.user.profile != null,
      ) ?? [];
    const progress = assessProgress({
      hasThesis: thesis != null,
      thesisStatus: thesis?.status ?? null,
      discipline: Boolean(thesis?.discipline),
      institution: Boolean(thesis?.institution),
      startedOn: thesis?.startedOn != null,
      expectedDefenseOn: thesis?.expectedDefenseOn != null,
      hasSupervisor: supervisors.length > 0,
    });
    const completion = profileCompletion(user.profile);
    const thesisIds = user.memberships.map((item) => item.thesisId);
    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: [...ACTIVITY_ACTIONS] },
        OR: [
          { actorId: userId },
          ...(thesisIds.length > 0 ? [{ thesisId: { in: thesisIds } }] : []),
        ],
      },
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
            select: {
              id: true,
              versionNumber: true,
              deliverable: { select: { title: true } },
            },
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

    const objectiveRows = thesis
      ? await this.prisma.objective.findMany({
          where: { thesisId: thesis.id },
          select: { id: true, title: true, status: true, dueDate: true, progress: true },
        })
      : [];
    const now = new Date();
    const objectiveCounts = summarizeObjectives(objectiveRows, now);
    const workProgress = { percentage: workProgressPercentage(objectiveRows) };
    const deliverableRows = thesis
      ? await this.prisma.deliverable.findMany({
          where: { thesisId: thesis.id },
          select: { id: true, title: true, status: true, dueDate: true },
        })
      : [];
    const deliverableCounts = summarizeDeliverables(deliverableRows, now);
    const defenseOn = thesis?.expectedDefenseOn ? formatDay(thesis.expectedDefenseOn) : null;
    const anchor = thesis?.startedOn ?? thesis?.createdAt ?? null;
    const objectiveDeadlines = objectiveRows.flatMap((item) => {
      if (!item.dueDate || item.status === 'CANCELLED' || item.status === 'COMPLETED') return [];
      const occursOn = formatDay(item.dueDate);
      return occursOn
        ? [{ id: item.id, kind: 'OBJECTIVE' as const, title: item.title, occursOn }]
        : [];
    });
    // Deadlines are the soonest open dates across objectives, tasks, deliverables and the defense, capped at 8.
    const openTasks = thesis
      ? await this.prisma.task.findMany({
          where: {
            dueDate: { not: null },
            status: { in: ['TODO', 'IN_PROGRESS'] },
            objective: {
              thesisId: thesis.id,
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
          },
          orderBy: { dueDate: 'asc' },
          take: 8,
          select: { id: true, title: true, dueDate: true },
        })
      : [];
    const taskDeadlines = openTasks.flatMap((item) => {
      const occursOn = formatDay(item.dueDate);
      return occursOn ? [{ id: item.id, kind: 'TASK' as const, title: item.title, occursOn }] : [];
    });
    const openDeliverables = deliverableRows
      .flatMap((item) =>
        item.dueDate && item.status !== 'VALIDATED' && item.status !== 'CANCELLED'
          ? [{ id: item.id, title: item.title, dueDate: item.dueDate }]
          : [],
      )
      .sort((left, right) => (left.dueDate.getTime() < right.dueDate.getTime() ? -1 : 1))
      .slice(0, 8);
    const deliverableDeadlines = openDeliverables.flatMap((item) => {
      const occursOn = formatDay(item.dueDate);
      return occursOn
        ? [{ id: item.id, kind: 'DELIVERABLE' as const, title: item.title, occursOn }]
        : [];
    });
    const kpis = [
      { id: 'progress' as const, value: String(workProgress.percentage) },
      { id: 'profile' as const, value: String(completion.percentage) },
      ...(thesis
        ? [
            { id: 'members' as const, value: String(thesis.memberships.length) },
            { id: 'tenure' as const, value: String(anchor ? daysSince(anchor) : 0) },
          ]
        : []),
    ];

    return {
      profile: presentAcademicProfile(toAcademicProfile(user.profile), userId, true),
      thesis: thesis
        ? {
            id: thesis.id,
            title: thesis.title,
            status: thesis.status,
            discipline: thesis.discipline,
            institution: thesis.institution,
            startedOn: formatDay(thesis.startedOn),
            expectedDefenseOn: formatDay(thesis.expectedDefenseOn),
            supervisors: supervisors.flatMap((item) =>
              item.user.profile ? [{ displayName: item.user.profile.displayName }] : [],
            ),
          }
        : null,
      progress,
      profileCompletion: completion,
      objectives: objectiveCounts,
      deliverables: deliverableCounts,
      kpis,
      workProgress,
      upcomingDeadlines: [
        ...objectiveDeadlines,
        ...taskDeadlines,
        ...deliverableDeadlines,
        ...(thesis && defenseOn
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
        .sort(byDay)
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

function byDay(left: { occursOn: string }, right: { occursOn: string }): number {
  if (left.occursOn < right.occursOn) return -1;
  if (left.occursOn > right.occursOn) return 1;
  return 0;
}
