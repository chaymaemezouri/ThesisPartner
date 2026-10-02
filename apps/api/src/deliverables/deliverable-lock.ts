import type { Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { DELIVERABLE_STATUSES, type DeliverableStatus } from './deliverable-rules';

/** Locks the deliverable row for the rest of the transaction. */
export async function lockDeliverable(
  tx: Prisma.TransactionClient,
  thesisId: string,
  deliverableId: string,
): Promise<{ id: string; status: DeliverableStatus } | null> {
  const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id::text AS id, status::text AS status
    FROM deliverables
    WHERE id = ${deliverableId}::uuid AND thesis_id = ${thesisId}::uuid
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) return null;
  if (!(DELIVERABLE_STATUSES as readonly string[]).includes(row.status)) {
    throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  }
  return { id: row.id, status: row.status as DeliverableStatus };
}
