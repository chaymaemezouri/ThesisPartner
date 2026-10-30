export function videoRoomUrl(meetingId: string): string {
  return `https://meet.jit.si/ThesisFlow${meetingId.replace(/-/g, '')}`;
}

export function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
