/** Explicitly provision demo access using runtime dependencies available in Docker. */
import { Algorithm, hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

async function main() {
  const studentEmail = (process.env.DEMO_STUDENT_EMAIL ?? 'demo.doctorant@example.test')
    .trim()
    .toLowerCase();
  const supervisorEmail = (process.env.DEMO_SUPERVISOR_EMAIL ?? 'demo.encadrant@example.test')
    .trim()
    .toLowerCase();
  const password = process.env.DEMO_PASSWORD ?? 'ThesisPartner2026!';
  if (!studentEmail || !supervisorEmail || studentEmail === supervisorEmail || !password) {
    throw new Error('Provide two distinct demo emails and a non-empty demo password.');
  }

  const accounts = [
    {
      email: studentEmail,
      givenName: 'Youssef',
      familyName: 'El Amrani',
      academicTitle: 'Doctorant',
    },
    {
      email: supervisorEmail,
      givenName: 'Karim',
      familyName: 'El Mansouri',
      academicTitle: 'Professeur',
    },
  ];
  const hashes = await Promise.all(
    accounts.map(() =>
      hash(password, {
        algorithm: Algorithm.Argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
    ),
  );
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const users = [];
      for (const [index, account] of accounts.entries()) {
        const { email, ...identity } = account;
        const profile = {
          ...identity,
          displayName: `${identity.givenName} ${identity.familyName}`,
        };
        users.push(
          await tx.user.upsert({
            where: { email },
            create: {
              email,
              passwordHash: hashes[index],
              emailVerifiedAt: new Date(),
              profile: { create: profile },
            },
            update: {
              passwordHash: hashes[index],
              emailVerifiedAt: new Date(),
              disabledAt: null,
              profile: { upsert: { create: profile, update: profile } },
            },
          }),
        );
      }
      const [student, supervisor] = users;
      const membership = await tx.thesisMembership.findFirst({
        where: { userId: student.id, role: 'DOCTORAL_STUDENT' },
        orderBy: { createdAt: 'asc' },
      });
      const thesisId = membership
        ? membership.thesisId
        : (
            await tx.thesis.create({
              data: {
                title:
                  'Apprentissage profond pour la détection d’anomalies dans les réseaux électriques intelligents',
                discipline: 'Informatique',
                institution: 'Université Mohammed V de Rabat',
                memberships: { create: { userId: student.id, role: 'DOCTORAL_STUDENT' } },
              },
            })
          ).id;
      await tx.thesisMembership.upsert({
        where: { thesisId_userId: { thesisId, userId: supervisor.id } },
        create: { thesisId, userId: supervisor.id, role: 'SUPERVISOR' },
        update: { role: 'SUPERVISOR' },
      });
      await tx.session.updateMany({
        where: { userId: { in: [student.id, supervisor.id] }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { thesisId };
    });
    process.stdout.write(`Demo access ready: ${studentEmail} (DOCTORAL_STUDENT)\n`);
    process.stdout.write(`Demo access ready: ${supervisorEmail} (SUPERVISOR)\n`);
    process.stdout.write(`Shared thesis: ${result.thesisId}\n`);
    process.stdout.write('Existing objectives, tasks, deliverables and remarks were preserved.\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
