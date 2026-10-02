import { measureObjectiveProgress, resolveTaskCompletedAt } from './task-progress';

const now = new Date('2026-09-29T12:00:00.000Z');
const earlier = new Date('2026-09-01T08:00:00.000Z');

describe('objective progress from tasks', () => {
  it('keeps the manual progress when the objective has no task', () => {
    const measured = measureObjectiveProgress(40, []);
    expect(measured).toMatchObject({ progress: 40, mode: 'MANUAL' });
    expect(measured.summary).toEqual({ total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 });
  });

  it('returns 0 when the only task is still to do', () => {
    expect(measureObjectiveProgress(40, [{ status: 'TODO' }])).toMatchObject({
      progress: 0,
      mode: 'TASK_BASED',
    });
  });

  it('returns 100 when the only active task is done', () => {
    expect(measureObjectiveProgress(0, [{ status: 'DONE' }]).progress).toBe(100);
  });

  it('rounds one of two done tasks to 50 and three of four to 75', () => {
    expect(measureObjectiveProgress(0, [{ status: 'DONE' }, { status: 'TODO' }]).progress).toBe(50);
    expect(
      measureObjectiveProgress(0, [
        { status: 'DONE' },
        { status: 'DONE' },
        { status: 'DONE' },
        { status: 'IN_PROGRESS' },
      ]).progress,
    ).toBe(75);
  });

  it('rounds one third down to 33 and two thirds up to 67', () => {
    expect(
      measureObjectiveProgress(0, [{ status: 'DONE' }, { status: 'TODO' }, { status: 'TODO' }])
        .progress,
    ).toBe(33);
    expect(
      measureObjectiveProgress(0, [{ status: 'DONE' }, { status: 'DONE' }, { status: 'TODO' }])
        .progress,
    ).toBe(67);
  });

  it('excludes cancelled tasks from the ratio', () => {
    const measured = measureObjectiveProgress(10, [
      { status: 'DONE' },
      { status: 'CANCELLED' },
      { status: 'TODO' },
    ]);
    expect(measured.progress).toBe(50);
    expect(measured.summary.cancelled).toBe(1);
    expect(measured.mode).toBe('TASK_BASED');
  });

  it('returns to manual progress when every task is cancelled', () => {
    const measured = measureObjectiveProgress(40, [
      { status: 'CANCELLED' },
      { status: 'CANCELLED' },
    ]);
    expect(measured).toMatchObject({ progress: 40, mode: 'MANUAL' });
  });

  it('switches from manual progress to the task ratio as soon as one active task exists', () => {
    expect(measureObjectiveProgress(80, []).mode).toBe('MANUAL');
    expect(measureObjectiveProgress(80, [{ status: 'TODO' }])).toMatchObject({
      progress: 0,
      mode: 'TASK_BASED',
    });
  });

  it('clears completedAt when a finished task returns to todo or in progress', () => {
    const done = { status: 'DONE' as const, completedAt: earlier };
    expect(resolveTaskCompletedAt('DONE', now, done)).toEqual(earlier);
    expect(resolveTaskCompletedAt('TODO', now, done)).toBeNull();
    expect(resolveTaskCompletedAt('IN_PROGRESS', now, done)).toBeNull();
    expect(resolveTaskCompletedAt('CANCELLED', now, done)).toBeNull();
    expect(resolveTaskCompletedAt('DONE', now)).toEqual(now);
  });
});
