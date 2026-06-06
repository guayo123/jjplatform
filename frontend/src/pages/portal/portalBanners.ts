import type { CSSProperties } from 'react';

export type BannerKey = 'japones' | 'jiujitsu' | 'minimal';

export const BANNER_KEYS: BannerKey[] = ['japones', 'jiujitsu', 'minimal'];

export const BANNER_LABELS: Record<BannerKey, string> = {
  japones: 'Japonés',
  jiujitsu: 'Jiu-Jitsu',
  minimal: 'Minimalista',
};

/** CSS-only banner designs (no image assets needed). */
export function bannerStyle(key: BannerKey): CSSProperties {
  switch (key) {
    case 'japones':
      // Rising sun over a deep red/black gradient
      return {
        background:
          'radial-gradient(circle at 85% 42%, #fde2e2 0 24px, rgba(253,226,226,0) 26px), ' +
          'linear-gradient(135deg, #0b0b0f 0%, #5b1212 60%, #b91c1c 100%)',
      };
    case 'jiujitsu':
      // Dark mat tone; a belt-colored stripe is rendered separately (BELT_BAR)
      return { background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 100%)' };
    case 'minimal':
      return { background: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)' };
  }
}

/** Belt-stripe accent shown at the bottom of the Jiu-Jitsu banner. */
export const BELT_BAR: CSSProperties = {
  background:
    'linear-gradient(90deg, #f8fafc 0 20%, #3b82f6 20% 40%, #8b5cf6 40% 60%, #92400e 60% 80%, #111827 80% 100%)',
};
