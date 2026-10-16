import { splitMeetings } from './meeting-rules';

describe('splitMeetings', () => {
  const today = '2026-10-08';

  it('keeps future planned meetings upcoming and past ones in history', () => {
    const split = splitMeetings(
      [
        { status: 'HELD' as const, scheduledOn: '2026-09-01', title: 'held' },
        { status: 'PLANNED' as const, scheduledOn: '2026-10-20', title: 'next' },
        { status: 'PLANNED' as const, scheduledOn: '2026-10-01', title: 'late' },
        { status: 'CANCELLED' as const, scheduledOn: '2026-11-01', title: 'cancelled' },
        { status: 'PLANNED' as const, scheduledOn: '2026-10-08', title: 'today' },
        { status: 'REQUESTED' as const, scheduledOn: null, title: 'asked' },
      ],
      today,
    );
    expect(split.upcoming.map((item) => item.title)).toEqual(['asked', 'today', 'next']);
    expect(split.history.map((item) => item.title)).toEqual(['cancelled', 'late', 'held']);
  });
});
