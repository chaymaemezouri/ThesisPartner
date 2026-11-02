/** Mark stuck PENDING uploads as CLEAN when no virus scanner is deployed. */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const before = await prisma.storedFile.groupBy({
    by: ['scanStatus'],
    _count: true,
  });
  process.stdout.write(`Before: ${JSON.stringify(before)}\n`);
  const result = await prisma.storedFile.updateMany({
    where: { scanStatus: 'PENDING' },
    data: { scanStatus: 'CLEAN' },
  });
  process.stdout.write(`Promoted ${result.count} file(s) from PENDING to CLEAN.\n`);
} finally {
  await prisma.$disconnect();
}
