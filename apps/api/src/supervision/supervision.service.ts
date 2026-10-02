import { Injectable } from '@nestjs/common';
import { formatDay } from '../common/dates';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { summarizeObjectives, supervisionSummary } from '../objectives/objective-rules';
import { resolveAvatarUrl } from '../profile/profile.service';

/**
 * The principal doctoral student is the DOCTORAL_STUDENT membership with the
 * earliest createdAt. Equal timestamps break the tie by userId.
 * This is the student recorded when the thesis was created, not an arbitrary row.
 */
@Injectable()
export class SupervisionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actorId: string) {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'SUPERVISOR' },
      include: {
        thesis: {
          include: {
            memberships: {
              include: { user: { include: { profile: true } } },
              orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
            },
            objectives: { select: { status: true, dueDate: true, progress: true } },
            meetings: { orderBy: { scheduledOn: 'asc' }, take: 20 },
            _count: { select: { deliverables: { where: { status: { not: 'CANCELLED' } } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    const now = new Date();
    return {
      theses: memberships.map((membership) => {
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
        const activeObjectives = membership.thesis.objectives.filter(
          (item) => item.status !== 'CANCELLED',
        );
        const progressPercentage =
          activeObjectives.length === 0
            ? 0
            : Math.round(
                activeObjectives.reduce((total, item) => total + item.progress, 0) /
                  activeObjectives.length,
              );
        const today = formatDay(now) ?? '';
        const counts = summarizeObjectives(membership.thesis.objectives, now);
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
          progressPercentage,
          deliverableCount: membership.thesis._count.deliverables,
          supervisors,
          meetings: membership.thesis.meetings.flatMap((meeting) => {
            const scheduledOn = formatDay(meeting.scheduledOn);
            if (!scheduledOn || scheduledOn < today) return [];
            return [{ id: meeting.id, title: meeting.title, scheduledOn }];
          }).slice(0, 8),
          doctoralStudent: students[0] ?? null,
          doctoralStudents: students,
          objectiveSummary: supervisionSummary(counts),
        };
      }),
    };
  }
}

function durationYears(start: Date | null, end: Date | null): number | null {
  if (!start || !end || end.getTime() < start.getTime()) return null;
  const years = Math.round((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.min(20, Math.max(0, years));
}
