import { useId, useState, type CSSProperties } from 'react';

/**
 * Student portal cover designs. Two kinds coexist:
 *  - "css"   : dependency-free vector scenes (Mt Fuji, waves, torii) drawn with SVG. Always available.
 *  - "image" : photographic covers served from /public/portadas/*. They only appear in the picker when
 *              the file actually loads, so dropping a JPG in that folder is all it takes to add one
 *              (and a missing file never shows a broken option).
 *
 * Any key here MUST also be whitelisted in the backend's PortalService.ALLOWED_BANNERS, or saving
 * the preference will be rejected. Keys are lowercase (the backend lowercases before validating).
 */
export interface BannerOption {
  key: string;
  label: string;
  kind: 'css' | 'image';
  src?: string;
}

export const SCENIC_BANNERS: BannerOption[] = [
  { key: 'japones', label: 'Monte Fuji', kind: 'css' },
  { key: 'olas', label: 'Olas', kind: 'css' },
  { key: 'torii', label: 'Torii', kind: 'css' },
  { key: 'jiujitsu', label: 'Jiu-Jitsu', kind: 'css' },
  { key: 'minimal', label: 'Minimalista', kind: 'css' },
  // The five keys below were photographic covers once; they keep their keys (saved
  // preferences and the backend whitelist still match) but are now vector scenes —
  // the old portrait PNGs could never fill a wide strip without pixelating.
  { key: 'samuraiwarrior', label: 'Samurái', kind: 'css' },
  { key: 'mujer', label: 'Sakura', kind: 'css' },
  { key: 'mujer2', label: 'Meditación', kind: 'css' },
  { key: 'tiburon', label: 'Tiburón', kind: 'css' },
  { key: 'tortugasninjas', label: 'Tortuga', kind: 'css' },
];

/**
 * Photographic covers. Drop a file in frontend/public/portadas/ AND list it here to enable one.
 * Requirements for it to look professional: wide landscape (~3:1, e.g. 1800×600 or larger),
 * sharp at full width — portrait/low-res images pixelate and force ugly blur-fill.
 */
export const IMAGE_BANNERS: BannerOption[] = [];

export const isImageBanner = (key: string) => IMAGE_BANNERS.some((b) => b.key === key);

export const bannerImageSrc = (key: string) => IMAGE_BANNERS.find((b) => b.key === key)?.src;

/** Base background for a cover: a photo for image banners, a gradient for scenic ones. */
export function bannerStyle(key: string): CSSProperties {
  const img = IMAGE_BANNERS.find((b) => b.key === key);
  if (img) {
    return { backgroundImage: `url(${img.src})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  switch (key) {
    case 'japones':
      return { background: 'linear-gradient(160deg, #1e1b4b 0%, #7c2d12 58%, #b91c1c 100%)' };
    case 'olas':
      return { background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 55%, #0891b2 100%)' };
    case 'torii':
      return { background: 'linear-gradient(180deg, #fbbf24 0%, #f97316 42%, #7c2d12 100%)' };
    case 'jiujitsu':
      return { background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 100%)' };
    case 'minimal':
      return { background: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)' };
    case 'samuraiwarrior':
      return { background: 'linear-gradient(165deg, #450a0a 0%, #7c2d12 55%, #b45309 100%)' };
    case 'mujer':
      return { background: 'linear-gradient(150deg, #312e81 0%, #701a75 60%, #9d174d 100%)' };
    case 'mujer2':
      return { background: 'linear-gradient(140deg, #0f172a 0%, #134e4a 70%, #155e75 100%)' };
    case 'tiburon':
      return { background: 'linear-gradient(180deg, #082f49 0%, #0c4a6e 60%, #155e75 100%)' };
    case 'tortugasninjas':
      return { background: 'linear-gradient(160deg, #022c22 0%, #065f46 55%, #0d9488 100%)' };
    default:
      return { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' };
  }
}

/** Belt-stripe accent shown at the bottom of the Jiu-Jitsu banner. */
export const BELT_BAR: CSSProperties = {
  background:
    'linear-gradient(90deg, #f8fafc 0 20%, #3b82f6 20% 40%, #8b5cf6 40% 60%, #92400e 60% 80%, #111827 80% 100%)',
};

/**
 * SVG scenery layered on top of the gradient for the scenic banners. Returns null for image/flat
 * banners (which need no decoration). Sized to slice-fill its positioned container.
 */
export function BannerArt({ banner }: { banner: string }) {
  const id = useId();
  const fill = 'absolute inset-0 w-full h-full';

  if (banner === 'japones') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="298" cy="64" r="44" fill="#fecaca" fillOpacity="0.9" />
        <path d="M-20 200 L150 80 Q160 70 170 80 L360 200 Z" fill="#0f172a" />
        <path
          d="M132 96 L150 80 Q160 70 170 80 L188 96 Q177 89 168 93 Q160 97 152 92 Q144 88 138 93 Q135 95 132 96 Z"
          fill="#e2e8f0"
        />
      </svg>
    );
  }

  if (banner === 'olas') {
    const pid = `seig-${id}`;
    return (
      <svg className={fill} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id={pid} x="0" y="0" width="56" height="28" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2">
              <circle cx="28" cy="28" r="26" />
              <circle cx="28" cy="28" r="18" />
              <circle cx="28" cy="28" r="10" />
              <circle cx="0" cy="28" r="26" />
              <circle cx="0" cy="28" r="18" />
              <circle cx="0" cy="28" r="10" />
              <circle cx="56" cy="28" r="26" />
              <circle cx="56" cy="28" r="18" />
              <circle cx="56" cy="28" r="10" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pid})`} />
      </svg>
    );
  }

  if (banner === 'torii') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="200" cy="120" r="58" fill="#fff7ed" fillOpacity="0.85" />
        <g fill="#1c1917">
          <path d="M150 60 L162 60 L168 200 L144 200 Z" />
          <path d="M238 60 L250 60 L256 200 L232 200 Z" />
          <path d="M120 56 Q200 40 280 56 L280 70 Q200 56 120 70 Z" />
          <rect x="190" y="40" width="20" height="10" />
          <rect x="150" y="92" width="100" height="13" />
        </g>
      </svg>
    );
  }

  if (banner === 'samuraiwarrior') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Red sun, drifting birds, ground, and a samurai silhouette with raised katana. */}
        <circle cx="290" cy="78" r="50" fill="#ef4444" fillOpacity="0.8" />
        <g stroke="#fef2f2" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M60 46 q7 -8 14 0 M74 46 q7 -8 14 0" />
          <path d="M110 30 q6 -7 12 0 M122 30 q6 -7 12 0" />
        </g>
        <path d="M0 176 Q120 164 230 172 T400 170 L400 200 L0 200 Z" fill="#1c1917" />
        <g fill="#1c1917">
          <circle cx="150" cy="86" r="10" />
          <circle cx="150" cy="71" r="5" />
          <path d="M138 95 L162 95 L167 134 L133 134 Z" />
          <path d="M133 134 L167 134 L177 176 L123 176 Z" />
          {/* sword arm + katana */}
          <path d="M160 100 L196 78 L199 85 L165 108 Z" />
          <path d="M194 80 L246 44 L249 49 L199 87 Z" />
        </g>
      </svg>
    );
  }

  if (banner === 'mujer') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Full moon and a cherry branch shedding petals in the dusk wind. */}
        <circle cx="300" cy="74" r="40" fill="#fdf2f8" fillOpacity="0.9" />
        <g fill="#3b0764">
          <path d="M-10 18 Q70 28 120 58 Q150 76 162 96 L154 102 Q138 80 108 64 Q60 38 -10 30 Z" />
          <path d="M96 52 Q118 40 142 46 L138 56 Q118 52 102 60 Z" />
        </g>
        <g fill="#f9a8d4">
          <circle cx="120" cy="62" r="7" />
          <circle cx="142" cy="50" r="6" />
          <circle cx="160" cy="92" r="7" />
          <circle cx="104" cy="56" r="5" />
        </g>
        <g fill="#f472b6" fillOpacity="0.8">
          <ellipse cx="200" cy="80" rx="4" ry="2.6" transform="rotate(-24 200 80)" />
          <ellipse cx="236" cy="110" rx="4" ry="2.6" transform="rotate(18 236 110)" />
          <ellipse cx="186" cy="128" rx="4" ry="2.6" transform="rotate(-40 186 128)" />
          <ellipse cx="262" cy="148" rx="4" ry="2.6" transform="rotate(30 262 148)" />
          <ellipse cx="312" cy="132" rx="4" ry="2.6" transform="rotate(-12 312 132)" />
        </g>
      </svg>
    );
  }

  if (banner === 'mujer2') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Lanterns glowing over still water and a figure meditating in seiza. */}
        <g>
          <circle cx="300" cy="56" r="16" fill="#fbbf24" fillOpacity="0.25" />
          <circle cx="300" cy="56" r="7" fill="#fcd34d" fillOpacity="0.9" />
          <circle cx="348" cy="92" r="12" fill="#fbbf24" fillOpacity="0.22" />
          <circle cx="348" cy="92" r="5" fill="#fcd34d" fillOpacity="0.85" />
          <circle cx="256" cy="96" r="10" fill="#fbbf24" fillOpacity="0.2" />
          <circle cx="256" cy="96" r="4" fill="#fcd34d" fillOpacity="0.8" />
        </g>
        <path d="M0 168 L400 168 L400 200 L0 200 Z" fill="#020617" fillOpacity="0.55" />
        <g fill="#020617">
          <circle cx="140" cy="118" r="11" />
          <path d="M148 112 q12 14 8 34 l-6 -2 q2 -16 -6 -28 Z" />
          <path d="M110 168 Q112 132 140 132 Q168 132 170 168 Z" />
        </g>
        <g stroke="#67e8f9" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round">
          <path d="M104 182 H176" />
          <path d="M118 190 H162" />
        </g>
      </svg>
    );
  }

  if (banner === 'tiburon') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Light shafts, a patrolling shark silhouette and a few bubbles. */}
        <g fill="#e0f2fe" fillOpacity="0.1">
          <path d="M120 0 L180 0 L120 200 L60 200 Z" />
          <path d="M250 0 L290 0 L250 200 L210 200 Z" />
        </g>
        <g fill="#051c2c">
          <path d="M96 108 Q150 76 226 82 Q268 86 292 102 Q304 110 318 110 L308 124 Q294 122 280 128 Q240 146 178 140 Q124 134 96 108 Z" />
          <path d="M180 84 L200 52 L212 86 Z" />
          <path d="M100 110 L64 88 L74 112 L62 136 L98 118 Z" />
          <path d="M206 132 L192 162 L222 146 Z" />
        </g>
        <g stroke="#0c4a6e" strokeWidth="2" strokeLinecap="round">
          <path d="M262 100 v12 M272 100 v12 M282 102 v10" />
        </g>
        <g fill="#e0f2fe" fillOpacity="0.3">
          <circle cx="330" cy="70" r="4" />
          <circle cx="342" cy="52" r="3" />
          <circle cx="336" cy="34" r="2.5" />
          <circle cx="76" cy="50" r="3" />
        </g>
      </svg>
    );
  }

  if (banner === 'tortugasninjas') {
    return (
      <svg className={fill} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* Sea turtle gliding through sunlit water. */}
        <g fill="#ecfdf5" fillOpacity="0.12">
          <path d="M80 0 L140 0 L90 200 L30 200 Z" />
        </g>
        <g fill="#022c22">
          <ellipse cx="220" cy="104" rx="54" ry="36" transform="rotate(-12 220 104)" />
          <circle cx="286" cy="84" r="13" />
          {/* front flippers */}
          <path d="M196 78 Q160 40 128 44 Q150 76 188 92 Z" />
          <path d="M206 134 Q176 166 148 164 Q168 134 200 122 Z" />
          {/* rear flippers */}
          <path d="M172 110 Q150 112 142 126 Q160 130 176 122 Z" />
        </g>
        {/* shell pattern */}
        <g stroke="#34d399" strokeOpacity="0.35" strokeWidth="2" fill="none">
          <ellipse cx="220" cy="104" rx="36" ry="22" transform="rotate(-12 220 104)" />
          <path d="M196 90 L244 118 M242 88 L198 120" />
        </g>
        <g fill="#ecfdf5" fillOpacity="0.3">
          <circle cx="320" cy="56" r="4" />
          <circle cx="334" cy="40" r="3" />
          <circle cx="326" cy="24" r="2.5" />
        </g>
      </svg>
    );
  }

  return null;
}

/**
 * One selectable thumbnail in the cover picker. Image thumbnails self-hide if their file is missing,
 * so unconfigured photo covers simply don't appear.
 */
export function BannerThumb({
  option,
  selected,
  onPick,
}: {
  option: BannerOption;
  selected: boolean;
  onPick: () => void;
}) {
  const [broken, setBroken] = useState(false);
  if (option.kind === 'image' && broken) return null;

  return (
    <button
      onClick={onPick}
      title={option.label}
      className={`relative w-28 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
        selected ? 'border-primary-500' : 'border-transparent hover:border-gray-300'
      }`}
      style={option.kind === 'css' ? bannerStyle(option.key) : { background: '#0f172a' }}
    >
      {option.kind === 'image' ? (
        <img
          src={option.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <BannerArt banner={option.key} />
      )}
      {option.key === 'jiujitsu' && <div className="absolute inset-x-0 bottom-0 h-1.5" style={BELT_BAR} />}
      <span className="absolute inset-x-0 bottom-0 text-[10px] text-white bg-black/40 text-center py-0.5">
        {option.label}
      </span>
    </button>
  );
}
