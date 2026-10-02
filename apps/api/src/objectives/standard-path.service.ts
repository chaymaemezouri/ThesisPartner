import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { STANDARD_OBJECTIVES } from './standard-path.catalog';

type Db = Prisma.TransactionClient;

@Injectable()
export class StandardPathService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$transaction((tx) => this.ensure(tx));
  }

  async ensure(db: Db): Promise<void> {
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

  async apply(db: Db, thesisId: string, actorId: string): Promise<number> {
    await this.ensure(db);
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
      const objective = await db.objective.create({
        data: {
          thesisId,
          title: template.title,
          description: template.description,
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
      if (template.tasks.length > 0) {
        await db.task.createMany({
          data: template.tasks.map((task) => ({
            objectiveId: objective.id,
            title: task.title,
            description: task.description,
            status: 'TODO' as const,
            position: task.position,
            origin: 'STANDARD_TEMPLATE' as const,
            createdById: actorId,
          })),
        });
      }
      created += 1;
    }
    return created;
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
