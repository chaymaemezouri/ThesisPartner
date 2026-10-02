export const TIMELINE_PHASES = [
  { id: 'stateOfArt' as const, pattern: /état de l.art/i },
  { id: 'experimentation' as const, pattern: /expérimentation/i },
  { id: 'writing' as const, pattern: /rédaction/i },
  { id: 'defense' as const, pattern: /soutenance/i },
] as const;

export type PhaseMark = 'done' | 'current' | 'upcoming';

export function markPhases(items: readonly { title: string; status: string }[]): PhaseMark[] {
  if (items.length === 0) return TIMELINE_PHASES.map(() => 'upcoming');
  const statuses = TIMELINE_PHASES.map((phase) => {
    const found = items.find((item) => phase.pattern.test(item.title));
    return found?.status ?? 'PLANNED';
  });
  let current = statuses.findIndex((status) => status === 'IN_PROGRESS');
  if (current < 0) {
    current = statuses.findIndex((status) => status !== 'COMPLETED' && status !== 'CANCELLED');
  }
  return statuses.map((status, index) => {
    if (status === 'COMPLETED') return 'done';
    if (index === current) return 'current';
    return 'upcoming';
  });
}
