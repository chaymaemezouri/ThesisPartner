import type { PrismaClient } from '@prisma/client';
import type request from 'supertest';

/** Create a SUPERVISOR invitation then finalize membership (for suite setup). */
export async function inviteSupervisor(
  prisma: PrismaClient,
  account: { agent: request.Agent; csrf: string },
  thesisId: string,
  email: string,
): Promise<void> {
  const response = await account.agent
    .post(`/api/v1/theses/${thesisId}/invitations`)
    .set('x-csrf-token', account.csrf)
    .send({ email, role: 'SUPERVISOR' });
  expect(response.status).toBe(201);

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    throw new Error(`Invitee account missing for ${email}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: response.body.id as string },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    await tx.thesisMembership.create({
      data: { thesisId, userId: invitee.id, role: 'SUPERVISOR' },
    });
  });
}
