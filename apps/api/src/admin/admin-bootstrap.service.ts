import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

/**
 * Secure first-time Super Admin attribution.
 * Registration never grants SUPER_ADMIN. This only promotes an existing account
 * when SUPER_ADMIN_BOOTSTRAP_EMAIL is set and no Super Admin exists yet.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapIfConfigured();
  }

  async bootstrapIfConfigured(): Promise<{ promoted: boolean; email?: string }> {
    const email = this.env.SUPER_ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    if (!email) return { promoted: false };

    const existingAdmins = await this.prisma.user.count({
      where: { platformRole: 'SUPER_ADMIN' },
    });
    if (existingAdmins > 0) {
      this.logger.write({
        level: 'info',
        msg: 'admin.bootstrap.skipped_existing_super_admin',
      });
      return { promoted: false };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.write({
        level: 'warn',
        msg: 'admin.bootstrap.user_not_found',
      });
      return { promoted: false };
    }

    if (user.platformRole === 'SUPER_ADMIN') {
      return { promoted: false, email };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { platformRole: 'SUPER_ADMIN' },
      });
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'admin.bootstrap_super_admin',
        entityType: 'user',
        entityId: user.id,
        metadata: { email, source: 'env.SUPER_ADMIN_BOOTSTRAP_EMAIL' },
      });
    });

    this.logger.write({
      level: 'info',
      msg: 'admin.bootstrap.promoted',
    });
    return { promoted: true, email };
  }
}
