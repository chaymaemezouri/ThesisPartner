import { assessProgress, workProgressPercentage } from './progress';

describe('assessProgress', () => {
  it('stays at zero when no thesis exists', () => {
    expect(
      assessProgress({
        hasThesis: false,
        thesisStatus: null,
        discipline: false,
        institution: false,
        startedOn: false,
        expectedDefenseOn: false,
        hasSupervisor: false,
      }),
    ).toEqual({ percentage: 0, status: 'NOT_STARTED' });
  });

  it('uses only the signals that exist today', () => {
    const result = assessProgress({
      hasThesis: true,
      thesisStatus: 'ACTIVE',
      discipline: true,
      institution: true,
      startedOn: false,
      expectedDefenseOn: false,
      hasSupervisor: true,
    });

    expect(result).toEqual({ percentage: 60, status: 'ON_TRACK' });
  });

  it('marks a suspended thesis at risk and accepts later signals', () => {
    const result = assessProgress(
      {
        hasThesis: true,
        thesisStatus: 'SUSPENDED',
        discipline: true,
        institution: false,
        startedOn: false,
        expectedDefenseOn: false,
        hasSupervisor: false,
      },
      [{ satisfied: true }],
    );

    expect(result.percentage).toBe(33);
    expect(result.status).toBe('AT_RISK');
  });
});

describe('workProgressPercentage', () => {
  it('averages active objectives and ignores cancelled ones', () => {
    expect(
      workProgressPercentage([
        { status: 'IN_PROGRESS', progress: 50 },
        { status: 'COMPLETED', progress: 100 },
        { status: 'CANCELLED', progress: 0 },
      ]),
    ).toBe(75);
  });

  it('is zero when every objective is cancelled', () => {
    expect(workProgressPercentage([{ status: 'CANCELLED', progress: 80 }])).toBe(0);
  });
});
