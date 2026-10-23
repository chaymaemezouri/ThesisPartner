/**
 * Promote an existing account to SUPER_ADMIN.
 * Usage (from repo root):
 *   node infrastructure/scripts/run-with-env.mjs node apps/api/scripts/promote-super-admin.mjs email@example.com
 *
 * Registration never grants SUPER_ADMIN. Prefer SUPER_ADMIN_BOOTSTRAP_EMAIL for the
 * first admin when none exists yet; use this script to add further Super Admins.
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Usage: promote-super-admin.mjs <email>');
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`No account found for ${email}`);
    }
    if (user.platformRole === 'SUPER_ADMIN') {
      process.stdout.write(`Already SUPER_ADMIN: ${email}\n`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { platformRole: 'SUPER_ADMIN' },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'admin.promote_super_admin',
          entityType: 'user',
          entityId: user.id,
          metadata: { email, source: 'cli.promote-super-admin' },
        },
      });
    });

    process.stdout.write(`Promoted to SUPER_ADMIN: ${email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Promote failed'}\n`);
  process.exit(1);
});
