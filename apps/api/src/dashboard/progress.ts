export type ThesisLifecycle = 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'ABANDONED';

export type ProgressStatus = 'NOT_STARTED' | 'ON_TRACK' | 'ATTENTION' | 'AT_RISK';

export type ProgressInput = {
  hasThesis: boolean;
  thesisStatus: ThesisLifecycle | null;
  discipline: boolean;
  institution: boolean;
  startedOn: boolean;
  expectedDefenseOn: boolean;
  hasSupervisor: boolean;
};

export type ExtraSignal = { satisfied: boolean };

const BASE_SIGNALS: Array<keyof Omit<ProgressInput, 'hasThesis' | 'thesisStatus'>> = [
  'discipline',
  'institution',
  'startedOn',
  'expectedDefenseOn',
  'hasSupervisor',
];

/** Same average the doctoral dashboard shows as thesis progress. Cancelled objectives are excluded. */
export function workProgressPercentage(
  objectives: readonly { status: string; progress: number }[],
): number {
  const active = objectives.filter((item) => item.status !== 'CANCELLED');
  if (active.length === 0) return 0;
  return Math.round(active.reduce((total, item) => total + item.progress, 0) / active.length);
}

export function assessProgress(
  input: ProgressInput,
  extra: readonly ExtraSignal[] = [],
): { percentage: number; status: ProgressStatus } {
  if (!input.hasThesis) {
    return { percentage: 0, status: 'NOT_STARTED' };
  }

  const signals = [
    ...BASE_SIGNALS.map((key) => input[key]),
    ...extra.map((item) => item.satisfied),
  ];
  const satisfied = signals.filter(Boolean).length;
  const percentage = Math.round((satisfied / signals.length) * 100);

  if (input.thesisStatus === 'SUSPENDED' || input.thesisStatus === 'ABANDONED') {
    return { percentage, status: 'AT_RISK' };
  }
  if (percentage < 50) return { percentage, status: 'ATTENTION' };
  return { percentage, status: 'ON_TRACK' };
}
