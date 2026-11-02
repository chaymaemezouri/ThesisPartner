/** Keep only the nine fictional Moroccan demo theses on the supervisor desk. */
import { PrismaClient } from '@prisma/client';

const supervisorEmail = 'demo.encadrant@example.test';
const keepEmails = new Set([
  'demo.doctorant@example.test',
  'amina.benjelloun@example.test',
  'yassine.elfassi@example.test',
  'salma.cherkaoui@example.test',
  'omar.idrissi@example.test',
  'imane.berrada@example.test',
  'hamza.tazi@example.test',
  'fatima.alaoui@example.test',
  'mehdi.bennani@example.test',
]);

const prisma = new PrismaClient();
try {
  const supervisor = await prisma.user.findUnique({ where: { email: supervisorEmail } });
  if (!supervisor) throw new Error('Supervisor not found');
  const memberships = await prisma.thesisMembership.findMany({
    where: { userId: supervisor.id, role: 'SUPERVISOR' },
    include: {
      thesis: {
        include: {
          memberships: {
            where: { role: 'DOCTORAL_STUDENT' },
            include: { user: { select: { email: true, profile: true } } },
          },
        },
      },
    },
  });
  let removed = 0;
  for (const row of memberships) {
    const student = row.thesis.memberships[0]?.user;
    const email = student?.email;
    const label = email ?? row.thesis.title;
    if (email && keepEmails.has(email)) {
      process.stdout.write(`Keep: ${label}\n`);
      continue;
    }
    await prisma.thesisMembership.delete({ where: { id: row.id } });
    removed += 1;
    process.stdout.write(`Removed supervisor link: ${label}\n`);
  }
  const remaining = await prisma.thesisMembership.count({
    where: { userId: supervisor.id, role: 'SUPERVISOR' },
  });
  process.stdout.write(`Done. Removed ${removed}. Supervised theses now: ${remaining}.\n`);
} finally {
  await prisma.$disconnect();
}
