import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  portfolioProjectInputSchema,
  portfolioSkillInputSchema,
  publicationInputSchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';

type PublicationBody = z.infer<typeof publicationInputSchema>;
type ProjectBody = z.infer<typeof portfolioProjectInputSchema>;
type SkillBody = z.infer<typeof portfolioSkillInputSchema>;

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfileService,
    private readonly audit: AuditService,
  ) {}

  async get(actorId: string) {
    const profile = await this.profiles.get(actorId);
    const [publications, projects, skills] = await Promise.all([
      this.prisma.publication.findMany({
        where: { userId: actorId },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.portfolioProject.findMany({
        where: { userId: actorId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.portfolioSkill.findMany({
        where: { userId: actorId },
        orderBy: { label: 'asc' },
      }),
    ]);
    return {
      profile: {
        displayName: profile.displayName,
        specialty: profile.specialty,
        academicTitle: profile.academicTitle,
        avatarUrl: profile.avatarUrl,
      },
      counts: {
        publications: publications.filter((item) => item.kind === 'ARTICLE').length,
        conferences: publications.filter((item) => item.kind === 'CONFERENCE').length,
        projects: projects.length,
      },
      publications: publications.map((item) => ({
        id: item.id,
        title: item.title,
        venue: item.venue,
        year: item.year,
        kind: item.kind,
        status: item.status,
      })),
      projects: projects.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
      })),
      skills: skills.map((item) => ({ id: item.id, label: item.label })),
    };
  }

  async addPublication(actorId: string, body: PublicationBody, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.publication.create({
        data: {
          userId: actorId,
          title: body.title.trim(),
          venue: body.venue.trim(),
          year: body.year,
          kind: body.kind,
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'portfolio.publication_added',
        entityType: 'publication',
        entityId: row.id,
        requestId,
      });
    });
    return this.get(actorId);
  }

  async removePublication(actorId: string, publicationId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.publication.findFirst({
        where: { id: publicationId, userId: actorId },
      });
      if (!current) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      await tx.publication.delete({ where: { id: publicationId } });
      await this.audit.record(tx, {
        actorId,
        action: 'portfolio.publication_removed',
        entityType: 'publication',
        entityId: publicationId,
        requestId,
      });
    });
    return this.get(actorId);
  }

  async addProject(actorId: string, body: ProjectBody, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.portfolioProject.create({
        data: {
          userId: actorId,
          title: body.title.trim(),
          summary: blankToNull(body.summary),
        },
      });
      await this.audit.record(tx, {
        actorId,
        action: 'portfolio.project_added',
        entityType: 'portfolio_project',
        entityId: row.id,
        requestId,
      });
    });
    return this.get(actorId);
  }

  async removeProject(actorId: string, projectId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.portfolioProject.findFirst({
        where: { id: projectId, userId: actorId },
      });
      if (!current) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      await tx.portfolioProject.delete({ where: { id: projectId } });
      await this.audit.record(tx, {
        actorId,
        action: 'portfolio.project_removed',
        entityType: 'portfolio_project',
        entityId: projectId,
        requestId,
      });
    });
    return this.get(actorId);
  }

  async addSkill(actorId: string, body: SkillBody, requestId?: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const row = await tx.portfolioSkill.create({
          data: { userId: actorId, label: body.label.trim() },
        });
        await this.audit.record(tx, {
          actorId,
          action: 'portfolio.skill_added',
          entityType: 'portfolio_skill',
          entityId: row.id,
          requestId,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(400, 'BAD_REQUEST', 'Cette compétence est déjà dans le portfolio');
      }
      throw error;
    }
    return this.get(actorId);
  }

  async removeSkill(actorId: string, skillId: string, requestId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.portfolioSkill.findFirst({ where: { id: skillId, userId: actorId } });
      if (!current) throw new AppException(404, 'NOT_FOUND', 'Resource not found');
      await tx.portfolioSkill.delete({ where: { id: skillId } });
      await this.audit.record(tx, {
        actorId,
        action: 'portfolio.skill_removed',
        entityType: 'portfolio_skill',
        entityId: skillId,
        requestId,
      });
    });
    return this.get(actorId);
  }
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
