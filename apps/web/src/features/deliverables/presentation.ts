import type { IconName } from '../../routes/nav';

export const STATUS_PRESENTATION = {
  all: {
    icon: 'deliverables',
    soft: 'bg-brand-soft/60',
    ink: 'text-brand',
    border: 'border-brand/30',
    badge: 'border-brand/15 bg-brand-soft text-brand',
  },
  DRAFT: {
    icon: 'pencil',
    soft: 'bg-brand-soft/60',
    ink: 'text-brand',
    border: 'border-brand/30',
    badge: 'border-brand/15 bg-brand-soft text-brand',
  },
  SUBMITTED: {
    icon: 'watch',
    soft: 'bg-violet-soft/70',
    ink: 'text-violet',
    border: 'border-violet/30',
    badge: 'border-violet/15 bg-violet-soft text-violet',
  },
  CHANGES_REQUESTED: {
    icon: 'remarks',
    soft: 'bg-warn-soft/80',
    ink: 'text-warn',
    border: 'border-warn/30',
    badge: 'border-warn/15 bg-warn-soft text-warn',
  },
  VALIDATED: {
    icon: 'portfolio',
    soft: 'bg-ok-soft/80',
    ink: 'text-ok',
    border: 'border-ok/30',
    badge: 'border-ok/15 bg-ok-soft text-ok',
  },
  CANCELLED: {
    icon: 'close',
    soft: 'bg-canvas',
    ink: 'text-muted',
    border: 'border-line',
    badge: 'border-line bg-canvas text-muted',
  },
} satisfies Record<
  string,
  { icon: IconName; soft: string; ink: string; border: string; badge: string }
>;

export function documentPresentation(type: string): { icon: IconName; tone: string; wash: string } {
  if (type === 'DATASET' || type === 'CODE')
    return { icon: 'radar', tone: 'bg-teal-soft text-teal', wash: 'from-teal-soft/70' };
  if (type === 'ARTICLE' || type === 'THESIS_CHAPTER')
    return { icon: 'thesis', tone: 'bg-violet-soft text-violet', wash: 'from-violet-soft/70' };
  if (type === 'PRESENTATION' || type === 'POSTER' || type === 'COMMUNICATION')
    return { icon: 'portfolio', tone: 'bg-warn-soft text-warn', wash: 'from-warn-soft/70' };
  return { icon: 'deliverables', tone: 'bg-brand-soft text-brand', wash: 'from-brand-soft/70' };
}
