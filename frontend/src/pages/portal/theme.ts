import { useEffect, useState } from 'react';
import { create } from 'zustand';

/**
 * Portal appearance theme. A theme is just a set of CSS tokens applied via
 * `data-theme` on the portal root (see index.css `.portal-theme[data-theme=…]`),
 * so switching is instant and components don't need to change. The user's choice
 * is persisted in localStorage; "system" follows the OS light/dark preference.
 */
export type ThemePref = 'system' | 'ember' | 'light';
export type ResolvedTheme = 'ember' | 'light';

const KEY = 'jjp_portal_theme';

function loadPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ember' || v === 'light' || v === 'system') return v;
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

function systemResolved(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'ember';
}

/** The theme actually applied — resolves "system" against the OS, live. */
export function useResolvedTheme(): ResolvedTheme {
  const pref = useThemeStore((s) => s.pref);
  const [sys, setSys] = useState<ResolvedTheme>(systemResolved);
  useEffect(() => {
    if (pref !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSys(systemResolved());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);
  return pref === 'system' ? sys : pref;
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
    key: 'system',
    label: 'Sistema',
    desc: 'Sigue el tema de tu teléfono',
    swatchBg: 'linear-gradient(135deg,#EEF1F6 50%,#12141b 50%)',
    swatchAccent: 'linear-gradient(135deg,#FF4133,#FF8A1E)',
  },
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
    desc: 'Limpio y aireado',
    swatchBg: '#EEF1F6',
    swatchAccent: 'linear-gradient(135deg,#FF4133,#FF8A1E)',
    swatchDot: '#c9d2e0',
  },
];
