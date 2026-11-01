import type { PrismaClient } from '@prisma/client';

/** True when this email still has an open supervisor invitation to accept. */
export async function hasPendingSupervisorInvite(
  prisma: Pick<PrismaClient, 'invitation'>,
  email: string,
): Promise<boolean> {
  const count = await prisma.invitation.count({
    where: {
      email: email.trim().toLowerCase(),
      role: 'SUPERVISOR',
      status: 'PENDING',
    },
  });
  return count > 0;
}
