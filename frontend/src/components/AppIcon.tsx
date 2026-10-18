import { Trophy, Fire, Barbell, Scales, Star, Handshake, Target, Sword, Medal, CalendarBlank, CalendarCheck, Lightning, TrendUp, TrendDown, ShieldCheck, Wrench, Flag, Hourglass, SmileyNervous, Prohibit, BoxingGlove, SealCheck, Repeat, Hash, Crown, HandFist, ArrowsClockwise, Timer, Truck, type Icon } from '@phosphor-icons/react';
import NoGiIcon from './NoGiIcon';
import GiIcon from './GiIcon';

/**
 * Iconos semanticos de la app. Los datos (logros, celebraciones, insights, estados) guardan una
 * clave en vez de un emoji, y aqui se resuelve el icono Phosphor correspondiente.
 */
export const ICONS = {
  trophy: Trophy,
  fire: Fire,
  martial: GiIcon,
  gym: Barbell,
  scale: Scales,
  star: Star,
  handshake: Handshake,
  target: Target,
  sword: Sword,
  medal: Medal,
  calendar: CalendarBlank,
  calendarCheck: CalendarCheck,
  lightning: Lightning,
  chartUp: TrendUp,
  chartDown: TrendDown,
  shield: ShieldCheck,
  wrench: Wrench,
  flag: Flag,
  hourglass: Hourglass,
  nervous: SmileyNervous,
  prohibit: Prohibit,
  boxing: BoxingGlove,
  seal: SealCheck,
  repeat: Repeat,
  hash: Hash,
  crown: Crown,
  handFist: HandFist,
  swap: ArrowsClockwise,
  timer: Timer,
  truck: Truck,
  nogi: NoGiIcon,
} satisfies Record<string, Icon>;

export type IconKey = keyof typeof ICONS;

interface Props {
  name: IconKey;
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
}

export default function AppIcon({ name, size = '1em', weight = 'regular', className }: Props) {
  const Ico = ICONS[name];
  return <Ico size={size} weight={weight} className={className} aria-hidden />;
}
