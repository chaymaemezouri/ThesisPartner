import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type AuditEntry = {
  actorId?: string;
  thesisId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(db: Prisma.TransactionClient | PrismaService, entry: AuditEntry): Promise<void> {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        thesisId: entry.thesisId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        requestId: entry.requestId?.slice(0, 64),
      },
    });
  }
}
