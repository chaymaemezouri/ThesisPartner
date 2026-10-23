import type { Icon as PhosphorIcon, IconProps } from '@phosphor-icons/react';
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  Broadcast,
  CalendarBlank,
  CaretRight,
  ChatTeardropText,
  Clock,
  DownloadSimple,
  Eye,
  FileText,
  GearSix,
  List,
  ListChecks,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Scroll,
  SignOut,
  SquaresFour,
  Trash,
  User,
  Users,
  X,
} from '@phosphor-icons/react';
import type { IconName } from '../routes/nav';

const icons: Record<IconName, PhosphorIcon> = {
  dashboard: SquaresFour,
  thesis: Scroll,
  objectives: ListChecks,
  deliverables: FileText,
  remarks: ChatTeardropText,
  meetings: CalendarBlank,
  messages: PaperPlaneTilt,
  watch: Clock,
  radar: Broadcast,
  portfolio: Briefcase,
  library: BookOpen,
  settings: GearSix,
  profile: User,
  supervision: Users,
  menu: List,
  chevron: CaretRight,
  notice: Bell,
  plus: Plus,
  pencil: PencilSimple,
  trash: Trash,
  close: X,
  back: ArrowLeft,
  eye: Eye,
  download: DownloadSimple,
  signOut: SignOut,
};

export function Icon({
  name,
  className,
  size = 20,
  weight = 'regular',
  ...props
}: IconProps & { name: IconName }) {
  const Phosphor = icons[name];
  return (
    <Phosphor aria-hidden="true" size={size} weight={weight} className={className} {...props} />
  );
}
