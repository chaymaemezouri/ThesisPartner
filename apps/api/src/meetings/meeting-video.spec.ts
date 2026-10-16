import { nextDay, videoRoomUrl } from './meeting-video';

describe('meeting video', () => {
  it('builds a stable room from the meeting id', () => {
    expect(videoRoomUrl('a59900d4-1e1d-41eb-989a-db2f3a9192a2')).toBe(
      'https://meet.jit.si/ThesisPartnera59900d41e1d41eb989adb2f3a9192a2',
    );
  });

  it('names the following UTC day', () => {
    expect(nextDay('2026-10-08')).toBe('2026-10-09');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
});
