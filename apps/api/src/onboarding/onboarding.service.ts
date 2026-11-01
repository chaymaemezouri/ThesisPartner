import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { trialStatusAt } from '../billing/billing.util';

type StepStatus = 'done' | 'todo' | 'blocked' | 'pending';

type Step = { id: string; status: StepStatus; href: string | null };

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        trial: true,
        memberships: {
          select: { role: true, thesisId: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user || !user.profile || user.disabledAt) {
      throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const roles = new Set(user.memberships.map((item) => item.role));
    const isDoctoral = roles.has('DOCTORAL_STUDENT');
    const isSupervisor = roles.has('SUPERVISOR');
    const persona =
      isDoctoral && isSupervisor
        ? ('BOTH' as const)
        : isDoctoral
          ? ('DOCTORAL_STUDENT' as const)
          : isSupervisor
            ? ('SUPERVISOR' as const)
            : ('NONE' as const);

    const emailVerified = user.emailVerifiedAt != null;
    const doctoralThesisId =
      user.memberships.find((item) => item.role === 'DOCTORAL_STUDENT')?.thesisId ?? null;
    const supervisedThesisIds = user.memberships
      .filter((item) => item.role === 'SUPERVISOR')
      .map((item) => item.thesisId);

    let trialActive = false;
    if (user.trial) {
      const status = trialStatusAt({
        stored: user.trial.status,
        startedAt: user.trial.startedAt,
        expiresAt: user.trial.expiresAt,
        now: new Date(),
      });
      trialActive = status === 'ACTIVE';
    }
    const hasSubscription = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'GRACE_PERIOD'] } },
      select: { id: true },
    });
    const canCreateThesis = trialActive || Boolean(hasSubscription);

    let inviteStatus: StepStatus = 'todo';
    let hasSupervisor = false;
    let objectiveCount = 0;
    let deliverableCount = 0;
    let meetingCount = 0;
    if (doctoralThesisId) {
      const [supervisor, objectives, deliverables, meetings, pendingInvite] = await Promise.all([
        this.prisma.thesisMembership.findFirst({
          where: { thesisId: doctoralThesisId, role: 'SUPERVISOR' },
          select: { id: true },
        }),
        this.prisma.objective.count({ where: { thesisId: doctoralThesisId } }),
        this.prisma.deliverable.count({ where: { thesisId: doctoralThesisId } }),
        this.prisma.meeting.count({ where: { thesisId: doctoralThesisId } }),
        this.prisma.invitation.findFirst({
          where: {
            thesisId: doctoralThesisId,
            role: 'SUPERVISOR',
            status: 'PENDING',
          },
          select: { id: true },
        }),
      ]);
      hasSupervisor = Boolean(supervisor);
      objectiveCount = objectives;
      deliverableCount = deliverables;
      meetingCount = meetings;
      inviteStatus = hasSupervisor ? 'done' : pendingInvite ? 'pending' : 'todo';
    }

    const pendingInbox = await this.prisma.invitation.count({
      where: { email: user.email, status: 'PENDING' },
    });
    const supervisedCount = supervisedThesisIds.length;

    let supervisedObjectives = 0;
    let supervisedDeliverables = 0;
    let supervisedMeetings = 0;
    let supervisedRemarks = 0;
    if (supervisedThesisIds.length > 0) {
      const [objectives, deliverables, meetings, remarks] = await Promise.all([
        this.prisma.objective.count({ where: { thesisId: { in: supervisedThesisIds } } }),
        this.prisma.deliverable.count({ where: { thesisId: { in: supervisedThesisIds } } }),
        this.prisma.meeting.count({ where: { thesisId: { in: supervisedThesisIds } } }),
        this.prisma.remark.count({ where: { thesisId: { in: supervisedThesisIds } } }),
      ]);
      supervisedObjectives = objectives;
      supervisedDeliverables = deliverables;
      supervisedMeetings = meetings;
      supervisedRemarks = remarks;
    }

    const steps: Step[] = [];
    if (persona === 'DOCTORAL_STUDENT' || persona === 'BOTH' || persona === 'NONE') {
      steps.push(
        {
          id: 'email',
          status: emailVerified ? 'done' : 'todo',
          href: emailVerified ? null : '/confirmation-email',
        },
        {
          id: 'trial',
          status: !emailVerified ? 'blocked' : canCreateThesis ? 'done' : 'todo',
          href: canCreateThesis ? null : '/abonnement',
        },
        {
          id: 'thesis',
          status: doctoralThesisId
            ? 'done'
            : !emailVerified || !canCreateThesis
              ? 'blocked'
              : 'todo',
          href: '/profil',
        },
        {
          id: 'invite',
          status: !doctoralThesisId ? 'blocked' : inviteStatus,
          href: '/profil',
        },
        {
          id: 'objectives',
          status: !doctoralThesisId ? 'blocked' : objectiveCount > 0 ? 'done' : 'todo',
          href: '/objectifs',
        },
        {
          id: 'explore',
          status:
            !doctoralThesisId
              ? 'blocked'
              : deliverableCount + meetingCount > 0 || objectiveCount > 0
                ? 'done'
                : 'todo',
          href: '/livrables',
        },
      );
    }
    if (persona === 'SUPERVISOR' || persona === 'BOTH') {
      steps.push(
        {
          id: 'supervisor_email',
          status: emailVerified ? 'done' : 'todo',
          href: emailVerified ? null : '/confirmation-email',
        },
        {
          id: 'supervisor_invitation',
          status: supervisedCount > 0 ? 'done' : pendingInbox > 0 ? 'pending' : 'todo',
          href: '/invitations',
        },
        {
          id: 'supervisor_students',
          status: supervisedCount > 0 ? 'done' : 'todo',
          href: '/encadrement',
        },
        {
          id: 'supervisor_objectives',
          status:
            supervisedCount === 0 ? 'blocked' : supervisedObjectives > 0 ? 'done' : 'todo',
          href: '/encadrement',
        },
        {
          id: 'supervisor_deliverables',
          status:
            supervisedCount === 0 ? 'blocked' : supervisedDeliverables > 0 ? 'done' : 'todo',
          href: '/livrables',
        },
        {
          id: 'supervisor_meetings',
          status:
            supervisedCount === 0
              ? 'blocked'
              : supervisedMeetings + supervisedRemarks > 0
                ? 'done'
                : 'todo',
          href: '/reunions',
        },
      );
    }

    return {
      persona,
      emailVerified,
      welcomeDismissed: user.profile.onboardingWelcomeDismissedAt != null,
      guideCompleted: user.profile.onboardingGuideCompletedAt != null,
      steps,
    };
  }

  async applyAction(userId: string, action: 'dismiss_welcome' | 'complete_guide' | 'reopen_guide') {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new AppException(404, 'NOT_FOUND', 'Profile not found');
    const now = new Date();
    await this.prisma.profile.update({
      where: { userId },
      data:
        action === 'dismiss_welcome'
          ? { onboardingWelcomeDismissedAt: now }
          : action === 'complete_guide'
            ? { onboardingGuideCompletedAt: now, onboardingWelcomeDismissedAt: now }
            : { onboardingGuideCompletedAt: null },
    });
    return this.status(userId);
  }
}
