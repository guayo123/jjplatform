interface BeltImageProps {
  belt: string;
  stripes: number;
  className?: string;
}

const COLORS: Record<string, {
  main: string; border: string; seam: string;
  panel: string; panelBorder: string; stripe: string;
}> = {
  Blanco:   { main: '#F9FAFB', border: '#9CA3AF', seam: '#E5E7EB', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Gris:     { main: '#9CA3AF', border: '#4B5563', seam: '#D1D5DB', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Amarillo: { main: '#FBBF24', border: '#D97706', seam: '#FDE68A', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Naranja:  { main: '#F97316', border: '#C2410C', seam: '#FED7AA', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Verde:    { main: '#22C55E', border: '#15803D', seam: '#86EFAC', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Azul:     { main: '#3B82F6', border: '#1D4ED8', seam: '#93C5FD', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Morado:   { main: '#8B5CF6', border: '#6D28D9', seam: '#DDD6FE', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Café:     { main: '#92400E', border: '#78350F', seam: '#B45309', panel: '#111827', panelBorder: '#374151', stripe: '#FFFFFF' },
  Negro:    { main: '#1F2937', border: '#111827', seam: '#374151', panel: '#DC2626', panelBorder: '#991B1B', stripe: '#FCD34D' },
};

export default function BeltImage({ belt, stripes, className = '' }: BeltImageProps) {
  const c = COLORS[belt] ?? COLORS.Blanco;
  const isBlack = belt === 'Negro';

  const W = 280, H = 52, R = 7;
  const panelW = isBlack ? 90 : 74;
  const panelX = W - panelW;

  // Stripe dimensions
  const sw = isBlack ? 5 : 8;   // stripe width
  const sg = isBlack ? 4 : 5;   // stripe gap
  const step = sw + sg;

  // Stripes are placed right-to-left inside the panel
  const stripeBaseX = W - 11 - sw;

  // Panel SVG path: straight left edge, rounded right corners
  const panel = [
    `M ${panelX} 2`,
    `H ${W - R - 1}`,
    `Q ${W - 1} 2 ${W - 1} ${R + 2}`,
    `V ${H - R - 2}`,
    `Q ${W - 1} ${H - 2} ${W - R - 1} ${H - 2}`,
    `H ${panelX} Z`,
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }}
      aria-label={`Cinturón ${belt} — ${stripes} grado${stripes !== 1 ? 's' : ''}`}
    >
      {/* Belt body */}
      <rect x="1" y="2" width={W - 2} height={H - 4} rx={R} fill={c.main} stroke={c.border} strokeWidth="1.5" />

      {/* Center seam */}
      <line x1="4" y1={H / 2} x2={panelX - 1} y2={H / 2} stroke={c.seam} strokeWidth="1.5" strokeLinecap="round" />

      {/* Divider between body and panel */}
      <line x1={panelX} y1="4" x2={panelX} y2={H - 4} stroke={c.border} strokeWidth="1.5" />

      {/* Panel */}
      <path d={panel} fill={c.panel} stroke={c.panelBorder} strokeWidth="1" />

      {/* Stripes */}
      {Array.from({ length: stripes }).map((_, i) => (
        <rect
          key={i}
          x={stripeBaseX - i * step}
          y="10"
          width={sw}
          height={H - 20}
          rx="2"
          fill={c.stripe}
          opacity="0.92"
        />
      ))}

      {/* Black belt Dan label */}
      {isBlack && stripes > 0 && (
        <text
          x={panelX + 6}
          y={H / 2 + 4}
          fontSize="10"
          fontWeight="700"
          fill="#FCD34D"
          fontFamily="system-ui, sans-serif"
        >
          {stripes}° Dan
        </text>
      )}
    </svg>
  );
}
