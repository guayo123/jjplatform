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
];

/** Photographic covers. Drop a matching file in frontend/public/portadas/ to enable one. */
export const IMAGE_BANNERS: BannerOption[] = [
  { key: 'samurai', label: 'Samurái', kind: 'image', src: '/portadas/samurai.jpg' },
  { key: 'dojo', label: 'Dojo', kind: 'image', src: '/portadas/dojo.jpg' },
  { key: 'sakura', label: 'Sakura', kind: 'image', src: '/portadas/sakura.jpg' },
];

export const isImageBanner = (key: string) => IMAGE_BANNERS.some((b) => b.key === key);

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
