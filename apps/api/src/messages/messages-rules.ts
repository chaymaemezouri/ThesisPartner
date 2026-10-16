export function isUnread(
  lastMessage: { authorId: string; createdAt: string } | null,
  lastReadAt: string | null,
  actorId: string,
): boolean {
  if (!lastMessage || lastMessage.authorId === actorId) return false;
  if (!lastReadAt) return true;
  return lastMessage.createdAt > lastReadAt;
}

type DirectThread = {
  kind: 'DIRECT' | 'GROUP';
  thesisId: string | null;
  updatedAt: string;
  participants: readonly { userId: string }[];
};

export function singleSupervisorThread<T extends DirectThread>(
  items: readonly T[],
  supervisorId: string | null,
): T[] {
  const groups = items.filter((item) => item.kind === 'GROUP');
  const withSupervisor = supervisorId
    ? items.filter(
        (item) =>
          item.kind === 'DIRECT' &&
          item.participants.some((person) => person.userId === supervisorId),
      )
    : [];
  const canonical = [...withSupervisor].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )[0];
  return canonical ? [canonical, ...groups] : groups;
}

export function oneThreadPerCounterpart<T extends DirectThread>(
  items: readonly T[],
  actorId: string,
): T[] {
  const groups = items.filter((item) => item.kind === 'GROUP');
  const chosen = new Map<string, T>();
  for (const item of items) {
    if (item.kind !== 'DIRECT') continue;
    const other = item.participants.find((person) => person.userId !== actorId)?.userId;
    if (!other) continue;
    const current = chosen.get(other);
    if (!current || item.updatedAt > current.updatedAt) chosen.set(other, item);
  }
  return [...chosen.values(), ...groups];
}

export function conversationLabel(
  kind: 'DIRECT' | 'GROUP',
  title: string | null,
  participants: readonly { userId: string; displayName: string }[],
  actorId: string,
  fallback: string,
): string {
  if (kind === 'GROUP') return title?.trim() || fallback;
  return participants.find((person) => person.userId !== actorId)?.displayName ?? fallback;
}
