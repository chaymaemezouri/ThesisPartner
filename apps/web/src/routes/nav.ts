import type { MessageKey } from '../i18n/translate';

export type IconName =
  | 'dashboard'
  | 'thesis'
  | 'objectives'
  | 'deliverables'
  | 'remarks'
  | 'meetings'
  | 'messages'
  | 'watch'
  | 'radar'
  | 'portfolio'
  | 'library'
  | 'settings'
  | 'profile'
  | 'supervision'
  | 'menu'
  | 'chevron'
  | 'notice'
  | 'plus'
  | 'pencil'
  | 'trash'
  | 'close'
  | 'back'
  | 'eye'
  | 'download'
  | 'signOut';

export type NavItem = {
  to: string;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  icon: IconName;
  end?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  {
    to: '/',
    labelKey: 'nav.dashboard',
    descriptionKey: 'nav.dashboardDesc',
    icon: 'dashboard',
    end: true,
  },
  {
    to: '/objectifs',
    labelKey: 'nav.objectives',
    descriptionKey: 'nav.objectivesDesc',
    icon: 'objectives',
  },
  {
    to: '/livrables',
    labelKey: 'nav.deliverables',
    descriptionKey: 'nav.deliverablesDesc',
    icon: 'deliverables',
  },
  {
    to: '/remarques',
    labelKey: 'nav.remarks',
    descriptionKey: 'nav.remarksDesc',
    icon: 'remarks',
  },
  {
    to: '/reunions',
    labelKey: 'nav.meetings',
    descriptionKey: 'nav.meetingsDesc',
    icon: 'meetings',
  },
  {
    to: '/ressources',
    labelKey: 'nav.resources',
    descriptionKey: 'nav.resourcesDesc',
    icon: 'library',
  },
  {
    to: '/messagerie',
    labelKey: 'nav.messages',
    descriptionKey: 'nav.messagesDesc',
    icon: 'messages',
  },
  {
    to: '/radar',
    labelKey: 'nav.radar',
    descriptionKey: 'nav.radarDesc',
    icon: 'radar',
  },
  {
    to: '/portfolio',
    labelKey: 'nav.portfolio',
    descriptionKey: 'nav.portfolioDesc',
    icon: 'portfolio',
  },
];

export const SUPERVISOR_NAV: NavItem[] = [
  {
    to: '/',
    labelKey: 'nav.dashboard',
    descriptionKey: 'nav.dashboardDesc',
    icon: 'dashboard',
    end: true,
  },
  {
    to: '/livrables',
    labelKey: 'nav.studentDeliverables',
    descriptionKey: 'nav.studentDeliverablesDesc',
    icon: 'deliverables',
  },
  {
    to: '/encadrement',
    labelKey: 'nav.myStudents',
    descriptionKey: 'nav.myStudentsDesc',
    icon: 'supervision',
  },
  {
    to: '/reunions',
    labelKey: 'nav.meetings',
    descriptionKey: 'nav.meetingsDesc',
    icon: 'meetings',
  },
  {
    to: '/suivi',
    labelKey: 'nav.followUp',
    descriptionKey: 'nav.followUpDesc',
    icon: 'radar',
  },
  {
    to: '/ressources',
    labelKey: 'nav.resources',
    descriptionKey: 'nav.resourcesDesc',
    icon: 'library',
  },
  {
    to: '/messagerie',
    labelKey: 'nav.messages',
    descriptionKey: 'nav.messagesDesc',
    icon: 'messages',
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    to: '/parametres',
    labelKey: 'nav.settings',
    descriptionKey: 'nav.settingsDesc',
    icon: 'settings',
  },
  {
    to: '/profil',
    labelKey: 'nav.profile',
    descriptionKey: 'nav.profileDesc',
    icon: 'profile',
  },
];

export const NAV_ITEMS = [...PRIMARY_NAV, ...SECONDARY_NAV];

export function navigationGroups(items: NavItem[]): { labelKey?: MessageKey; items: NavItem[] }[] {
  const supervisor = items.some((item) => item.to === '/encadrement');
  const groups: { labelKey?: MessageKey; paths: string[] }[] = [
    { paths: ['/'] },
    {
      labelKey: supervisor ? 'nav.groupSupervision' : 'nav.groupThesis',
      paths: supervisor
        ? ['/encadrement', '/livrables', '/suivi']
        : ['/objectifs', '/livrables', '/remarques'],
    },
    { labelKey: 'nav.groupExchanges', paths: ['/reunions', '/messagerie'] },
    { labelKey: 'nav.groupResearch', paths: ['/ressources', '/radar', '/portfolio'] },
  ];
  return groups
    .map(({ labelKey, paths }) => ({
      labelKey,
      items: paths.flatMap((path) => items.filter((item) => item.to === path)),
    }))
    .filter((group) => group.items.length > 0);
}

export function navItemForPath(
  pathname: string,
  items: NavItem[] = NAV_ITEMS,
): NavItem | undefined {
  const exact = items.find((item) => item.to === pathname);
  if (exact) return exact;
  return [...items]
    .filter((item) => item.to !== '/' && pathname.startsWith(`${item.to}/`))
    .sort((left, right) => right.to.length - left.to.length)[0];
}
