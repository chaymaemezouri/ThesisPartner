import type { Prisma } from '@prisma/client';
import { AppException } from '../common/errors/app.exception';
import { REMARK_STATUSES, type RemarkStatus } from './remark-rules';

export async function lockRemark(
  tx: Prisma.TransactionClient,
  thesisId: string,
  remarkId: string,
): Promise<{ id: string; status: RemarkStatus } | null> {
  const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id::text AS id, status::text AS status
    FROM remarks
    WHERE id = ${remarkId}::uuid AND thesis_id = ${thesisId}::uuid
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) return null;
  if (!(REMARK_STATUSES as readonly string[]).includes(row.status)) {
    throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  }
  return { id: row.id, status: row.status as RemarkStatus };
}
