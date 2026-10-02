import type { Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';

/** Locks the objective row for the rest of the transaction. A missing row is a 404. */
export async function lockObjective(
  tx: Prisma.TransactionClient,
  objectiveId: string,
  thesisId: string,
  now: Date,
): Promise<void> {
  const updated = await tx.objective.updateMany({
    where: { id: objectiveId, thesisId },
    data: { updatedAt: now },
  });
  if (updated.count !== 1) {
    throw new AppException(404, 'NOT_FOUND', 'Resource not found');
  }
}
