import { Injectable } from '@nestjs/common';
import type { sharedResourceInputSchema } from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

type ResourceBody = z.infer<typeof sharedResourceInputSchema>;

const resourceInclude = {
  author: { select: { profile: { select: { displayName: true } } } },
} as const;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actorId: string) {
    const canShare = await this.isSupervisor(actorId);
    const authorIds = canShare ? [actorId] : await this.supervisorIdsForStudent(actorId);
    if (authorIds.length === 0) return { canShare, resources: [] };

    const rows = await this.prisma.sharedResource.findMany({
      where: { authorId: { in: authorIds } },
      orderBy: { createdAt: 'desc' },
      include: resourceInclude,
      take: 200,
    });
    return {
      canShare,
      resources: rows.map((row) => ({
        id: row.id,
        title: row.title,
        kind: row.kind,
        source: row.source,
        summary: row.summary,
        url: row.url,
        authorName: row.author.profile?.displayName ?? '',
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async create(actorId: string, body: ResourceBody, requestId?: string) {
    if (!(await this.isSupervisor(actorId))) {
      throw new AppException(403, 'FORBIDDEN', 'Seul un encadrant peut partager un document');
    }
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.sharedResource.create({
        data: {
          authorId: actorId,
          kind: body.kind,
          title: body.title.trim(),
          source: blankToNull(body.source),
          summary: blankToNull(body.summary),
          url: blankToNull(body.url),
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'resource.shared',
        entityType: 'shared_resource',
        entityId: row.id,
        requestId,
      });
    });
    return this.list(actorId);
  }

  async update(actorId: string, resourceId: string, body: ResourceBody, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.sharedResource.findUnique({ where: { id: resourceId } });
      if (!existing || existing.authorId !== actorId) {
        throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
      }
      await tx.sharedResource.update({
        where: { id: resourceId },
        data: {
          kind: body.kind,
          title: body.title.trim(),
          source: blankToNull(body.source),
          summary: blankToNull(body.summary),
          url: blankToNull(body.url),
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'resource.updated',
        entityType: 'shared_resource',
        entityId: resourceId,
        requestId,
      });
    });
    return this.list(actorId);
  }

  async remove(actorId: string, resourceId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.sharedResource.findUnique({ where: { id: resourceId } });
      if (!existing || existing.authorId !== actorId) {
        throw new AppException(404, 'NOT_FOUND', 'Ce document est introuvable');
      }
      await tx.sharedResource.delete({ where: { id: resourceId } });
      await this.audit.record(tx, {
        actorId,
        action: 'resource.removed',
        entityType: 'shared_resource',
        entityId: resourceId,
        requestId,
      });
    });
    return this.list(actorId);
  }

  private async isSupervisor(actorId: string): Promise<boolean> {
    const membership = await this.prisma.thesisMembership.findFirst({
      where: { userId: actorId, role: 'SUPERVISOR' },
      select: { id: true },
    });
    return membership !== null;
  }

  private async supervisorIdsForStudent(actorId: string): Promise<string[]> {
    const memberships = await this.prisma.thesisMembership.findMany({
      where: { userId: actorId, role: 'DOCTORAL_STUDENT' },
      select: { thesisId: true },
    });
    const thesisIds = memberships.map((membership) => membership.thesisId);
    if (thesisIds.length === 0) return [];
    const supervisors = await this.prisma.thesisMembership.findMany({
      where: { thesisId: { in: thesisIds }, role: 'SUPERVISOR' },
      select: { userId: true },
    });
    return [...new Set(supervisors.map((membership) => membership.userId))];
  }
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
