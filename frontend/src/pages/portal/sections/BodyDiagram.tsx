import type { MuscleRegion } from '../exerciseCatalog';

export type { MuscleRegion };

const ON   = '#f97316'; // worked muscle (orange)
const OFF  = '#cbd5e1'; // not targeted (slate-300)
const BODY = '#e2e8f0'; // silhouette fill
const EDGE = '#94a3b8'; // silhouette outline

interface Props {
  /** Muscles to highlight. Pass [] for no highlight. */
  muscles: MuscleRegion[];
  className?: string;
}

export default function BodyDiagram({ muscles, className = '' }: Props) {
  const active = new Set<MuscleRegion>(muscles);
  const fill = (r: MuscleRegion) => (active.has(r) ? ON : OFF);

  return (
    <div className={`flex items-end justify-center gap-6 ${className}`}>
      <FrontFigure fill={fill} />
      <BackFigure fill={fill} />
    </div>
  );
}

function Silhouette() {
  return (
    <g fill={BODY} stroke={EDGE} strokeWidth="1.4" strokeLinejoin="round">
      <circle cx="45" cy="17" r="11" />
      <rect x="40" y="26" width="10" height="7" rx="2" />
      <path d="M26 36 Q45 31 64 36 L61 96 Q45 101 29 96 Z" />
      <path d="M26 37 Q19 40 18 60 L16 100 Q20 102 23 100 L26 62 Z" />
      <path d="M64 37 Q71 40 72 60 L74 100 Q70 102 67 100 L64 62 Z" />
      <path d="M30 95 L28 150 L31 196 Q35 198 38 196 L43 100 Z" />
      <path d="M60 95 L62 150 L59 196 Q55 198 52 196 L47 100 Z" />
    </g>
  );
}

function FrontFigure({ fill }: { fill: (r: MuscleRegion) => string }) {
  return (
    <svg viewBox="0 0 90 210" width="84" height="196" aria-label="Músculos vista frontal">
      <Silhouette />
      <ellipse cx="28" cy="40" rx="6" ry="5" fill={fill('shoulders')} />
      <ellipse cx="62" cy="40" rx="6" ry="5" fill={fill('shoulders')} />
      <path d="M33 44 Q45 41 45 41 L45 56 Q39 59 33 56 Z" fill={fill('chest')} />
      <path d="M57 44 Q45 41 45 41 L45 56 Q51 59 57 56 Z" fill={fill('chest')} />
      <rect x="38" y="60" width="14" height="28" rx="4" fill={fill('abs')} />
      <ellipse cx="21" cy="62" rx="3.6" ry="11" fill={fill('arms')} />
      <ellipse cx="69" cy="62" rx="3.6" ry="11" fill={fill('arms')} />
      <ellipse cx="35" cy="125" rx="6.5" ry="22" fill={fill('legs')} />
      <ellipse cx="55" cy="125" rx="6.5" ry="22" fill={fill('legs')} />
    </svg>
  );
}

function BackFigure({ fill }: { fill: (r: MuscleRegion) => string }) {
  return (
    <svg viewBox="0 0 90 210" width="84" height="196" aria-label="Músculos vista posterior">
      <Silhouette />
      <ellipse cx="28" cy="40" rx="6" ry="5" fill={fill('shoulders')} />
      <ellipse cx="62" cy="40" rx="6" ry="5" fill={fill('shoulders')} />
      <path d="M33 45 L45 43 L45 78 Q39 80 34 74 Z" fill={fill('back')} />
      <path d="M57 45 L45 43 L45 78 Q51 80 56 74 Z" fill={fill('back')} />
      <ellipse cx="21" cy="62" rx="3.6" ry="11" fill={fill('arms')} />
      <ellipse cx="69" cy="62" rx="3.6" ry="11" fill={fill('arms')} />
      <ellipse cx="37" cy="100" rx="6" ry="7" fill={fill('legs')} />
      <ellipse cx="53" cy="100" rx="6" ry="7" fill={fill('legs')} />
      <ellipse cx="35" cy="135" rx="6.5" ry="20" fill={fill('legs')} />
      <ellipse cx="55" cy="135" rx="6.5" ry="20" fill={fill('legs')} />
    </svg>
  );
}
