import type { SVGProps } from 'react';
import type { IconName } from '../routes/nav';

const paths: Record<IconName, string> = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  thesis: 'M6 4h9l3 3v13H6zM15 4v3h3',
  objectives: 'M12 4v16M6 8h12M6 16h12',
  deliverables: 'M7 4h10v16H7zM9 8h6M9 12h6M9 16h4',
  remarks: 'M5 6h14v9H8l-3 3z',
  meetings: 'M6 5h12v14H6zM6 9h12M9 3v4M15 3v4',
  messages: 'M4 6h16v12H4zM4 6l8 7 8-7',
  watch: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v5l3 2',
  radar: 'M12 4a8 8 0 1 0 8 8M12 12l5-3',
  portfolio: 'M4 8h16v10H4zM8 8V6h8v2',
  library: 'M4 5h7a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3zM20 5h-7a3 3 0 0 0-3 3v11h7a3 3 0 0 1 3 3z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2',
  profile: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 19c1.2-2.4 3.2-3.5 6-3.5s4.8 1.1 6 3.5',
  supervision:
    'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 19c.6-2 2-3 4-3s3.4 1 4 3M14 16.2c.5-1.2 1.6-2 3-2 1.6 0 2.8.7 3.5 2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevron: 'M9 6l6 6-6 6',
  notice: 'M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9zM10 18.5a2 2 0 0 0 4 0',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M4 20h4l11-11-4-4L4 16zM13 7l4 4',
  trash: 'M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 6l-6 6 6 6',
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
