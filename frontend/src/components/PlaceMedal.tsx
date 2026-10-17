import { Medal } from '@phosphor-icons/react';

const COLORS: Record<1 | 2 | 3, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-600',
};

/** Medalla de podio (oro / plata / bronce). */
export default function PlaceMedal({ place, size = '1.1em', className = '' }: { place: 1 | 2 | 3; size?: number | string; className?: string }) {
  return <Medal weight="fill" size={size} className={`inline-block flex-shrink-0 align-[-0.15em] ${COLORS[place]} ${className}`} aria-label={`Puesto ${place}`} />;
}
