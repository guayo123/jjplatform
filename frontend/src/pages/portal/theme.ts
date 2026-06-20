import { create } from 'zustand';

/**
 * Portal appearance theme. A theme is just a set of CSS tokens applied via
 * `data-theme` on the portal root (see index.css `.portal-theme[data-theme=…]`),
 * so switching is instant and components don't need to change. The user's choice
 * is persisted in localStorage.
 *
 *  - ember:   dark "dojo" theme with the crimson/ember accent (default)
 *  - light:   light, airy surfaces, same ember accent
 *  - classic: the original light + blue look, kept as an option
 */
export type ThemePref = 'ember' | 'light' | 'classic';

const KEY = 'jjp_portal_theme';

function loadPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ember' || v === 'light' || v === 'classic') return v;
  } catch { /* ignore */ }
  return 'ember';
}

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  pref: loadPref(),
  setPref: (pref) => {
    try { localStorage.setItem(KEY, pref); } catch { /* ignore */ }
    set({ pref });
  },
}));

/** The theme currently applied (just the saved preference). */
export function useResolvedTheme(): ThemePref {
  return useThemeStore((s) => s.pref);
}

/** Picker metadata: label, blurb and a mini preview swatch per option. */
export const THEME_OPTIONS: {
  key: ThemePref;
  label: string;
  desc: string;
  swatchBg: string;
  swatchAccent: string;
  swatchDot?: string;
}[] = [
  {
    key: 'ember',
    label: 'Ember · Oscuro',
    desc: 'Dojo oscuro, acento carmesí 🔥',
    swatchBg: '#12141b',
    swatchAccent: 'linear-gradient(135deg,#FF4133,#FF8A1E)',
    swatchDot: '#A78BFA',
  },
  {
    key: 'light',
    label: 'Claro',
    desc: 'Limpio y aireado, acento ember',
    swatchBg: '#EEF1F6',
    swatchAccent: 'linear-gradient(135deg,#FF4133,#FF8A1E)',
    swatchDot: '#c9d2e0',
  },
  {
    key: 'classic',
    label: 'Clásico · Azul',
    desc: 'El azul original de la app',
    swatchBg: '#EEF1F6',
    swatchAccent: 'linear-gradient(135deg,#3B82F6,#2563EB)',
    swatchDot: '#c9d2e0',
  },
];
