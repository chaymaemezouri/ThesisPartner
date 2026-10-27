import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type MembershipRole } from '@prisma/client';
import type { AdminReactivateBody, AdminSuspendBody } from '@thesispartner/validation';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../auth/session.service';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  ADMIN_ACTIVITY_ACTIONS,
  daysAgo,
  fillDailySeries,
  sanitizeAuditMetadata,
  toDayKey,
  toMonthKey,
} from './admin-analytics.util';

export type AdminUserListQuery = {
  search?: string;
  status?: 'ACTIVE' | 'DISABLED';
  membershipRole?: MembershipRole;
  platformRole?: 'USER' | 'SUPER_ADMIN';
  page: number;
  pageSize: number;
};

export type AdminAuditListQuery = {
  search?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

type DayCountRow = { day: Date; count: bigint | number };

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    private readonly health: HealthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async stats() {
    const now = new Date();
    const d7 = daysAgo(7, now);
    const d30 = daysAgo(30, now);
    const d365 = daysAgo(365, now);
    const daySeriesFrom = daysAgo(60, now);

    const [
      totalUsers,
      activeAccounts,
      suspendedAccounts,
      theses,
      activeTheses,
      doctoralStudents,
      supervisors,
      invitationGroups,
      registrationsLast7Days,
      registrationsLast30Days,
      registrationsLast12Months,
      registrationRows,
      health,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { disabledAt: null } }),
      this.prisma.user.count({ where: { disabledAt: { not: null } } }),
      this.prisma.thesis.count(),
      this.prisma.thesis.count({ where: { status: 'ACTIVE' } }),
      this.distinctMembershipUsers('DOCTORAL_STUDENT'),
      this.distinctMembershipUsers('SUPERVISOR'),
      this.prisma.invitation.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d365 } } }),
      this.registrationCountsByDay(daySeriesFrom, now),
      this.health.check(),
    ]);

    const invitationCounts = {
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      CANCELLED: 0,
    };
    for (const row of invitationGroups) {
      invitationCounts[row.status] = row._count._all;
    }

    const dayMap = new Map<string, number>();
    for (const row of registrationRows) {
      dayMap.set(toDayKey(new Date(row.day)), Number(row.count));
    }

    return {
      totalUsers,
      activeAccounts,
      suspendedAccounts,
      doctoralStudents,
      supervisors,
      theses,
      activeTheses,
      invitationsPending: invitationCounts.PENDING,
      invitationsAccepted: invitationCounts.ACCEPTED,
      invitationsRejected: invitationCounts.REJECTED,
      invitationsExpired: invitationCounts.EXPIRED,
      registrationsLast7Days,
      registrationsLast30Days,
      registrationsLast12Months,
      registrationsByDay: fillDailySeries(daySeriesFrom, now, dayMap),
      health,
    };
  }

  async analytics() {
    const now = new Date();
    const d30 = daysAgo(30, now);
    const d90 = daysAgo(90, now);
    const d7 = daysAgo(7, now);
    const monthFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    const [
      registrationDayRows,
      registrationMonthRows,
      activityDayRows,
      thesesWithoutSupervisor,
      pendingInvitationsOlderThan7Days,
      expiredInvitations,
      activeSessions,
      loginsLast30Days,
      supervisorChangesLast30Days,
    ] = await Promise.all([
      this.registrationCountsByDay(d90, now),
      this.registrationCountsByMonth(monthFrom, now),
      this.activityCountsByDay(d90, now),
      this.prisma.thesis.count({
        where: {
          status: 'ACTIVE',
          memberships: { none: { role: 'SUPERVISOR' } },
        },
      }),
      this.prisma.invitation.count({
        where: {
          status: 'PENDING',
          createdAt: { lt: d7 },
          expiresAt: { gt: now },
        },
      }),
      this.prisma.invitation.count({ where: { status: 'EXPIRED' } }),
      this.prisma.session.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'auth.login', createdAt: { gte: d30 } },
      }),
      this.prisma.auditLog.count({
        where: {
          action: { in: ['supervision.replaced', 'invitation.supervisor_change_created'] },
          createdAt: { gte: d30 },
        },
      }),
    ]);

    const regDayMap = new Map<string, number>();
    for (const row of registrationDayRows) {
      regDayMap.set(toDayKey(new Date(row.day)), Number(row.count));
    }
    const activityMap = new Map<string, number>();
    for (const row of activityDayRows) {
      activityMap.set(toDayKey(new Date(row.day)), Number(row.count));
    }

    const monthMap = new Map<string, number>();
    for (const row of registrationMonthRows) {
      monthMap.set(toMonthKey(new Date(row.day)), Number(row.count));
    }

    return {
      registrationsByDay: fillDailySeries(d90, now, regDayMap),
      registrationsByMonth: this.fillMonthlySeries(monthFrom, now, monthMap),
      activityByDay: fillDailySeries(d90, now, activityMap),
      thesesWithoutSupervisor,
      pendingInvitationsOlderThan7Days,
      expiredInvitations,
      activeSessions,
      loginsLast30Days,
      supervisorChangesLast30Days,
    };
  }

  async listAudit(query: AdminAuditListQuery) {
    const where = this.buildAuditWhere(query);
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: { include: { profile: true } },
          thesis: { select: { id: true, title: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      entries: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        actorId: row.actorId,
        actorEmail: row.actor?.email ?? null,
        actorDisplayName: row.actor?.profile?.displayName?.trim() || null,
        thesisId: row.thesisId,
        thesisTitle: row.thesis?.title?.trim() || null,
        requestId: row.requestId,
        metadata: sanitizeAuditMetadata(row.metadata),
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getAuditEntry(entryId: string) {
    const row = await this.prisma.auditLog.findUnique({
      where: { id: entryId },
      include: {
        actor: { include: { profile: true } },
        thesis: { select: { id: true, title: true } },
      },
    });
    if (!row) {
      throw new AppException(404, 'NOT_FOUND', 'Audit entry not found');
    }

    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      actorDisplayName: row.actor?.profile?.displayName?.trim() || null,
      thesisId: row.thesisId,
      thesisTitle: row.thesis?.title?.trim() || null,
      requestId: row.requestId,
      metadata: sanitizeAuditMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async system() {
    const now = new Date();
    const since24h = daysAgo(1, now);
    const [
      health,
      activeSessions,
      auditEventsLast24Hours,
      failedLoginsLast24Hours,
      invitationsPending,
    ] = await Promise.all([
      this.health.check(),
      this.prisma.session.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since24h } } }),
      this.prisma.auditLog.count({
        where: { action: 'auth.login_failed', createdAt: { gte: since24h } },
      }),
      this.prisma.invitation.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      health,
      checkedAt: now.toISOString(),
      nodeEnv: this.env.NODE_ENV,
      activeSessions,
      auditEventsLast24Hours,
      failedLoginsLast24Hours,
      invitationsPending,
    };
  }

  async listUsers(query: AdminUserListQuery) {
    const where = this.buildUserWhere(query);
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          memberships: { select: { role: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      users: rows.map((user) => {
        if (!user.profile) {
          throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
        }
        const membershipRoles = [...new Set(user.memberships.map((item) => item.role))];
        return {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerifiedAt != null,
          displayName: user.profile.displayName,
          givenName: user.profile.givenName,
          familyName: user.profile.familyName,
          platformRole: user.platformRole,
          disabledAt: user.disabledAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          membershipRoles,
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        memberships: {
          include: { thesis: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user || !user.profile) {
      throw new AppException(404, 'NOT_FOUND', 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerifiedAt != null,
      displayName: user.profile.displayName,
      givenName: user.profile.givenName,
      familyName: user.profile.familyName,
      institution: user.profile.institution,
      academicTitle: user.profile.academicTitle,
      platformRole: user.platformRole,
      disabledAt: user.disabledAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((item) => ({
        thesisId: item.thesis.id,
        thesisTitle: item.thesis.title,
        thesisStatus: item.thesis.status,
        role: item.role,
      })),
    };
  }

  async suspend(actorId: string, targetUserId: string, body: AdminSuspendBody, requestId?: string) {
    if (actorId === targetUserId) {
      throw new AppException(400, 'BAD_REQUEST', 'You cannot suspend your own account');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new AppException(404, 'NOT_FOUND', 'User not found');
    }
    if (target.disabledAt) {
      throw new AppException(409, 'CONFLICT', 'Account is already suspended');
    }

    if (target.platformRole === 'SUPER_ADMIN') {
      const activeSuperAdmins = await this.prisma.user.count({
        where: { platformRole: 'SUPER_ADMIN', disabledAt: null },
      });
      if (activeSuperAdmins <= 1) {
        throw new AppException(400, 'BAD_REQUEST', 'Cannot suspend the last active Super Admin');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { disabledAt: new Date() },
      });
      await this.sessions.revokeAll(tx, targetUserId);
      await this.audit.record(tx, {
        actorId,
        action: 'admin.user_suspend',
        entityType: 'user',
        entityId: targetUserId,
        requestId,
        metadata: {
          reason: body.reason,
          targetEmail: target.email,
          targetPlatformRole: target.platformRole,
        },
      });
    });

    return this.getUser(targetUserId);
  }

  async reactivate(
    actorId: string,
    targetUserId: string,
    body: AdminReactivateBody,
    requestId?: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new AppException(404, 'NOT_FOUND', 'User not found');
    }
    if (!target.disabledAt) {
      throw new AppException(409, 'CONFLICT', 'Account is already active');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { disabledAt: null },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'admin.user_reactivate',
        entityType: 'user',
        entityId: targetUserId,
        requestId,
        metadata: {
          reason: body.reason?.trim() || null,
          targetEmail: target.email,
          targetPlatformRole: target.platformRole,
        },
      });
    });

    return this.getUser(targetUserId);
  }

  private async distinctMembershipUsers(role: MembershipRole): Promise<number> {
    const rows = await this.prisma.thesisMembership.groupBy({
      by: ['userId'],
      where: { role },
    });
    return rows.length;
  }

  private async registrationCountsByDay(from: Date, to: Date): Promise<DayCountRow[]> {
    return this.prisma.$queryRaw<DayCountRow[]>`
      SELECT DATE_TRUNC('day', "created_at") AS day, COUNT(*)::int AS count
      FROM "users"
      WHERE "created_at" >= ${from} AND "created_at" < ${to}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  private async registrationCountsByMonth(from: Date, to: Date): Promise<DayCountRow[]> {
    return this.prisma.$queryRaw<DayCountRow[]>`
      SELECT DATE_TRUNC('month', "created_at") AS day, COUNT(*)::int AS count
      FROM "users"
      WHERE "created_at" >= ${from} AND "created_at" < ${to}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  private async activityCountsByDay(from: Date, to: Date): Promise<DayCountRow[]> {
    const actions = [...ADMIN_ACTIVITY_ACTIONS];
    return this.prisma.$queryRaw<DayCountRow[]>`
      SELECT DATE_TRUNC('day', "created_at") AS day, COUNT(*)::int AS count
      FROM "audit_logs"
      WHERE "created_at" >= ${from}
        AND "created_at" < ${to}
        AND "action" IN (${Prisma.join(actions)})
      GROUP BY 1
      ORDER BY 1
    `;
  }

  private fillMonthlySeries(
    fromInclusive: Date,
    toExclusive: Date,
    counts: Map<string, number>,
  ): { date: string; count: number }[] {
    const points: { date: string; count: number }[] = [];
    const cursor = new Date(
      Date.UTC(fromInclusive.getUTCFullYear(), fromInclusive.getUTCMonth(), 1),
    );
    const end = new Date(Date.UTC(toExclusive.getUTCFullYear(), toExclusive.getUTCMonth(), 1));
    while (cursor <= end) {
      const key = toMonthKey(cursor);
      points.push({ date: key, count: counts.get(key) ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return points;
  }

  private buildAuditWhere(query: AdminAuditListQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action?.trim()) {
      where.action = { contains: query.action.trim(), mode: 'insensitive' };
    }
    if (query.entityType?.trim()) {
      where.entityType = query.entityType.trim();
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { requestId: { contains: search, mode: 'insensitive' } },
        { actor: { email: { contains: search.toLowerCase(), mode: 'insensitive' } } },
        {
          actor: {
            profile: { displayName: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    return where;
  }

  private buildUserWhere(query: AdminUserListQuery): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (query.status === 'ACTIVE') where.disabledAt = null;
    if (query.status === 'DISABLED') where.disabledAt = { not: null };
    if (query.platformRole) where.platformRole = query.platformRole;
    if (query.membershipRole) {
      where.memberships = { some: { role: query.membershipRole } };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
        { profile: { displayName: { contains: search, mode: 'insensitive' } } },
        { profile: { givenName: { contains: search, mode: 'insensitive' } } },
        { profile: { familyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}
