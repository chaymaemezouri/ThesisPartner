import { AppException } from '../common/errors/app.exception';
import { SupervisionService } from './supervision.service';

const access = {
  coverageForThesis: jest.fn().mockResolvedValue({
    writable: true,
    source: 'trial',
    expiresAt: null,
  }),
};

describe('SupervisionService access', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const thesisId = '22222222-2222-4222-8222-222222222222';

  it('lists only theses where the actor is the supervisor', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new SupervisionService({ thesisMembership: { findMany } } as never, access as never);

    await expect(service.list(actorId)).resolves.toEqual({ theses: [] });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: actorId, role: 'SUPERVISOR' },
      }),
    );
  });

  it('hides a thesis the actor does not supervise', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new SupervisionService({ thesis: { findFirst } } as never, access as never);

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

  it('prioritizes unfinished work and reports the recorded activity date', async () => {
    const lastActivity = new Date('2026-10-18T10:30:00.000Z');
    const findMany = jest.fn().mockResolvedValue([
      {
        thesis: {
          id: thesisId,
          title: 'Thesis',
          status: 'ACTIVE',
          discipline: null,
          institution: null,
          startedOn: null,
          expectedDefenseOn: null,
          memberships: [],
          objectives: [
            {
              id: 'done',
              title: 'Completed',
              status: 'COMPLETED',
              dueDate: new Date('2026-01-01'),
              progress: 100,
            },
            {
              id: 'work',
              title: 'Pending chapter',
              status: 'IN_PROGRESS',
              dueDate: new Date('2026-10-20'),
              progress: 30,
            },
          ],
          deliverables: [
            {
              id: 'validated',
              title: 'Validated',
              status: 'VALIDATED',
              submittedAt: null,
              versions: [],
              dueDate: new Date('2026-01-02'),
            },
            {
              id: 'pending',
              title: 'To review',
              status: 'SUBMITTED',
              submittedAt: new Date('2026-10-18T09:00:00.000Z'),
              versions: [{ versionNumber: 2 }],
              dueDate: new Date('2026-10-21'),
            },
          ],
          meetings: [],
          auditLogs: [{ createdAt: lastActivity }],
        },
      },
    ]);
    const service = new SupervisionService({ thesisMembership: { findMany } } as never, access as never);
    const result = await service.list(actorId);
    expect(result.theses[0]).toMatchObject({
      nextDeadline: {
        id: 'work',
        title: 'Pending chapter',
        occursOn: '2026-10-20',
        kind: 'OBJECTIVE',
      },
      pendingValidationCount: 1,
      pendingDeliverables: [
        {
          id: 'pending',
          title: 'To review',
          latestVersionNumber: 2,
          submittedAt: '2026-10-18T09:00:00.000Z',
        },
      ],
      lastActivityAt: lastActivity.toISOString(),
    });
  });
});
