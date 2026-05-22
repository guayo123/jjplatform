interface BeltImageProps {
  belt: string;
  stripes: number;
  colorHex?: string;
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

// Derive belt colors from a hex value by computing darker/lighter variants
function colorsFromHex(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const isDark = luminance < 0.35;

  const darken = (v: number, amt: number) => Math.max(0, Math.round(v * (1 - amt)));
  const lighten = (v: number, amt: number) => Math.min(255, Math.round(v + (255 - v) * amt));
  const toHex = (rv: number, gv: number, bv: number) =>
    `#${rv.toString(16).padStart(2, '0')}${gv.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;

  return {
    main: hex,
    border: toHex(darken(r, 0.25), darken(g, 0.25), darken(b, 0.25)),
    seam:   isDark
      ? toHex(lighten(r, 0.35), lighten(g, 0.35), lighten(b, 0.35))
      : toHex(darken(r, 0.12), darken(g, 0.12), darken(b, 0.12)),
    panel:        '#111827',
    panelBorder:  '#374151',
    stripe: '#FFFFFF',
  };
}

export default function BeltImage({ belt, stripes, colorHex, className = '' }: BeltImageProps) {
  const c = colorHex ? colorsFromHex(colorHex) : (COLORS[belt] ?? colorsFromHex('#9CA3AF'));
  const isBlack = !colorHex && belt === 'Negro';

  const W = 280, H = 52, R = 7;
  const panelW = isBlack ? 90 : 74;
  const panelX = W - panelW;

  const sw = isBlack ? 5 : 8;
  const sg = isBlack ? 4 : 5;
  const step = sw + sg;
  const stripeBaseX = W - 11 - sw;

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
      <rect x="1" y="2" width={W - 2} height={H - 4} rx={R} fill={c.main} stroke={c.border} strokeWidth="1.5" />
      <line x1="4" y1={H / 2} x2={panelX - 1} y2={H / 2} stroke={c.seam} strokeWidth="1.5" strokeLinecap="round" />
      <line x1={panelX} y1="4" x2={panelX} y2={H - 4} stroke={c.border} strokeWidth="1.5" />
      <path d={panel} fill={c.panel} stroke={c.panelBorder} strokeWidth="1" />
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
      {isBlack && stripes > 0 && (
        <text x={panelX + 6} y={H / 2 + 4} fontSize="10" fontWeight="700" fill="#FCD34D" fontFamily="system-ui, sans-serif">
          {stripes}° Dan
        </text>
      )}
    </svg>
  );
}
