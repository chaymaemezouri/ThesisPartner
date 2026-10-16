import { AppException } from '../common/errors/app.exception';
import { SupervisionService } from './supervision.service';

describe('SupervisionService access', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const thesisId = '22222222-2222-4222-8222-222222222222';

  it('lists only theses where the actor is the supervisor', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new SupervisionService({ thesisMembership: { findMany } } as never);

    await expect(service.list(actorId)).resolves.toEqual({ theses: [] });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: actorId, role: 'SUPERVISOR' },
      }),
    );
  });

  it('hides a thesis the actor does not supervise', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new SupervisionService({ thesis: { findFirst } } as never);

    const error = await service.space(actorId, thesisId).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(404);
    expect((error as AppException).appCode).toBe('NOT_FOUND');
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: thesisId,
          memberships: { some: { userId: actorId, role: 'SUPERVISOR' } },
        },
      }),
    );
  });
});
