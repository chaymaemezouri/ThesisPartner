export const REMARK_STATUS_STYLE = {
  OPEN: {
    ink: 'text-brand',
    soft: 'bg-brand-soft',
    wash: 'bg-brand-soft/45',
    edge: 'border-brand/20',
  },
  IN_PROGRESS: {
    ink: 'text-violet',
    soft: 'bg-violet-soft',
    wash: 'bg-violet-soft/45',
    edge: 'border-violet/20',
  },
  RESOLVED: {
    ink: 'text-ok',
    soft: 'bg-ok-soft',
    wash: 'bg-ok-soft/55',
    edge: 'border-ok/20',
  },
  CLOSED: {
    ink: 'text-muted',
    soft: 'bg-canvas',
    wash: 'bg-canvas/70',
    edge: 'border-line',
  },
} as const;
