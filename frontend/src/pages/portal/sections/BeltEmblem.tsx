// A martial-arts belt (obi) emblem rendered in the student's own belt color.
// White by default. Used in the profile as a premium identity piece.

const BELT_HEX: Record<string, string> = {
  Blanco: '#FFFFFF',
  Gris: '#9CA3AF',
  Amarillo: '#F4C430',
  Naranja: '#F97316',
  Verde: '#16A34A',
  Azul: '#2563EB',
  Morado: '#7C3AED',
  Marrón: '#7C4A1E',
  Marron: '#7C4A1E',
  Negro: '#15171C',
};

function shade(hex: string, f: number): string {
  if (!hex || hex.length < 7) return hex || '#FFFFFF';
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.round(r * f));
  g = Math.min(255, Math.round(g * f));
  b = Math.min(255, Math.round(b * f));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export default function BeltEmblem({
  colorHex,
  belt,
  stripes = 0,
  size = 72,
}: {
  colorHex?: string | null;
  belt?: string | null;
  stripes?: number | null;
  size?: number;
}) {
  const color = colorHex || (belt ? BELT_HEX[belt] : null) || '#FFFFFF';
  const uid = (colorHex || belt || 'w').replace(/[^a-z0-9]/gi, '');
  const tip = '#111418';
  const stripeColor = color.toUpperCase() === '#15171C' ? '#FF6A4D' : '#FFFFFF';
  const n = Math.min(4, Math.max(0, stripes ?? 0));

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Cinturón ${belt ?? ''}`}>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(color, 1.12)} />
          <stop offset="1" stopColor={shade(color, 0.82)} />
        </linearGradient>
      </defs>
      {/* band */}
      <rect x="8" y="44" width="84" height="15" rx="4" fill={`url(#bg-${uid})`} />
      {/* rank bar: black tip + degree stripes */}
      <rect x="70" y="44" width="16" height="15" rx="2" fill={tip} />
      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={72.5 + i * 3.5} y="46" width="2.1" height="11" rx="1" fill={stripeColor} />
      ))}
      {/* tails */}
      <rect x="40" y="56" width="9" height="30" rx="3" fill={`url(#bg-${uid})`} />
      <rect x="51" y="56" width="9" height="26" rx="3" fill={shade(color, 0.9)} />
      {/* central knot */}
      <rect x="36" y="40" width="13" height="22" rx="4" fill={shade(color, 1.05)} transform="rotate(8 42 51)" />
      <rect x="51" y="40" width="13" height="22" rx="4" fill={shade(color, 0.92)} transform="rotate(-8 58 51)" />
      <rect x="41" y="46.5" width="18" height="9" rx="3.5" fill={shade(color, 1.15)} />
    </svg>
  );
}
