import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  STANDARD_OBJECTIVES,
  parseStandardPathLocale,
  standardObjectivesFor,
  type StandardPathLocale,
} from './standard-path.catalog';

type Db = Prisma.TransactionClient;

@Injectable()
export class StandardPathService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$transaction((tx) => this.ensureTemplates(tx));
  }

  async ensureTemplates(db: Db): Promise<void> {
    const parked = await db.objectiveTemplate.findMany({ select: { id: true, position: true } });
    for (const row of parked) {
      await db.objectiveTemplate.update({
        where: { id: row.id },
        data: { position: row.position + 1000 },
      });
    }
    for (const [index, item] of STANDARD_OBJECTIVES.entries()) {
      const position = index + 1;
      const template = await db.objectiveTemplate.upsert({
        where: { code: item.code },
        create: {
          code: item.code,
          position,
          title: item.title,
          description: item.description,
        },
        update: {
          position,
          title: item.title,
          description: item.description,
        },
      });
      await db.taskTemplate.deleteMany({ where: { templateId: template.id } });
      if (item.tasks.length > 0) {
        await db.taskTemplate.createMany({
          data: item.tasks.map((task, taskIndex) => ({
            templateId: template.id,
            position: taskIndex + 1,
            title: task.title,
            description: task.description ?? null,
          })),
        });
      }
    }
  }

  private async syncThesisCopies(
    db: Db,
    thesisId: string,
    locale: StandardPathLocale,
  ): Promise<void> {
    const localized = standardObjectivesFor(locale);
    for (const item of localized) {
      await db.objective.updateMany({
        where: { thesisId, templateCode: item.code, origin: 'STANDARD_TEMPLATE' },
        data: { title: item.title, description: item.description },
      });
      const objectives = await db.objective.findMany({
        where: { thesisId, templateCode: item.code, origin: 'STANDARD_TEMPLATE' },
        select: { id: true },
      });
      for (const [taskIndex, task] of item.tasks.entries()) {
        for (const objective of objectives) {
          await db.task.updateMany({
            where: {
              objectiveId: objective.id,
              origin: 'STANDARD_TEMPLATE',
              position: taskIndex + 1,
            },
            data: {
              title: task.title,
              description: task.description ?? null,
            },
          });
        }
      }
    }
  }

  async apply(
    db: Db,
    thesisId: string,
    actorId: string,
    localeRaw?: string | null,
  ): Promise<number> {
    const locale = parseStandardPathLocale(localeRaw);
    await this.ensureTemplates(db);
    const localized = standardObjectivesFor(locale);
    const byCode = new Map(localized.map((item) => [item.code, item]));
    const templates = await db.objectiveTemplate.findMany({
      orderBy: { position: 'asc' },
      include: { tasks: { orderBy: { position: 'asc' } } },
    });
    const existing = await db.objective.findMany({
      where: { thesisId, templateCode: { not: null } },
      select: { templateCode: true },
    });
    const present = new Set(existing.map((row) => row.templateCode));
    const student = await db.thesisMembership.findFirst({
      where: { thesisId, role: 'DOCTORAL_STUDENT' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    let created = 0;
    for (const template of templates) {
      if (present.has(template.code)) continue;
      const copy = byCode.get(template.code);
      const title = copy?.title ?? template.title;
      const description = copy?.description ?? template.description;
      const objective = await db.objective.create({
        data: {
          thesisId,
          title,
          description,
          status: template.position === 1 ? 'IN_PROGRESS' : 'PLANNED',
          priority: 'MEDIUM',
          progress: 0,
          manualProgress: 0,
          origin: 'STANDARD_TEMPLATE',
          templateCode: template.code,
          createdById: actorId,
          responsibleUserId: student?.userId ?? null,
        },
      });
      const taskRows = copy
        ? copy.tasks.map((task, taskIndex) => ({
            objectiveId: objective.id,
            title: task.title,
            description: task.description ?? null,
            status: 'TODO' as const,
            position: taskIndex + 1,
            origin: 'STANDARD_TEMPLATE' as const,
            createdById: actorId,
          }))
        : template.tasks.map((task) => ({
            objectiveId: objective.id,
            title: task.title,
            description: task.description,
            status: 'TODO' as const,
            position: task.position,
            origin: 'STANDARD_TEMPLATE' as const,
            createdById: actorId,
          }));
      if (taskRows.length > 0) {
        await db.task.createMany({ data: taskRows });
      }
      created += 1;
    }
    await this.syncThesisCopies(db, thesisId, locale);
    return created;
  }

  async localize(thesisId: string, localeRaw?: string | null): Promise<void> {
    const locale = parseStandardPathLocale(localeRaw);
    await this.prisma.$transaction(async (tx) => {
      await this.ensureTemplates(tx);
      await this.syncThesisCopies(tx, thesisId, locale);
    });
  }

  async applied(thesisId: string): Promise<boolean> {
    const [templates, linked] = await Promise.all([
      this.prisma.objectiveTemplate.count(),
      this.prisma.objective.findMany({
        where: { thesisId, templateCode: { not: null } },
        select: { templateCode: true },
        distinct: ['templateCode'],
      }),
    ]);
    return templates > 0 && linked.length >= templates;
  }
}
