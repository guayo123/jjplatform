import { tapLight } from '../../native/haptics';

export type PortalTab = 'entreno' | 'retos' | 'fichas' | 'pagos' | 'perfil';

const TABS: { key: PortalTab; label: string }[] = [
  { key: 'entreno', label: 'Entreno' },
  { key: 'retos',   label: 'Retos' },
  { key: 'fichas',  label: 'Fichas' },
  { key: 'pagos',   label: 'Pagos' },
  { key: 'perfil',  label: 'Perfil' },
];

/**
 * Custom martial-arts icon set for the tab bar — hand-drawn SVG strokes instead of
 * emojis, so the icons look identical on every device and tint with `currentColor`
 * (the active/inactive classes keep working). The active tab gets a slightly
 * heavier stroke for a subtle "filled" feel.
 */
export function TabIcon({ tab, active, size = 24 }: { tab: PortalTab; active: boolean; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2.1 : 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (tab) {
    case 'entreno': // gi jacket: lapels, sleeves and belt
      return (
        <svg {...common}>
          <path d="M8.5 3.5 H15.5 L19 5 L20.5 9.5 L17.8 10.6 L17 8.5 V20 H7 V8.5 L6.2 10.6 L3.5 9.5 L5 5 Z" />
          <path d="M8.5 3.5 L12 10.5 L15.5 3.5" />
          <path d="M7 15.5 H17" />
        </svg>
      );
    case 'retos': // crossed katanas
      return (
        <svg {...common}>
          <path d="M4.5 4 L15.8 15.3" />
          <path d="M19.5 4 L8.2 15.3" />
          <path d="M13.9 17.2 L17.7 13.4" />
          <path d="M10.1 17.2 L6.3 13.4" />
          <path d="M16.6 16.4 L19.5 19.3" />
          <path d="M7.4 16.4 L4.5 19.3" />
        </svg>
      );
    case 'fichas': // belt with center knot and hanging tails
      return (
        <svg {...common}>
          <path d="M2.5 9.5 H9 M15 9.5 H21.5" />
          <path d="M2.5 13 H8.5 M15.5 13 H21.5" />
          <path d="M12 8 L15.2 11.2 L12 14.4 L8.8 11.2 Z" />
          <path d="M10.6 14 L9 19.5" />
          <path d="M13.4 14 L15 19.5" />
        </svg>
      );
    case 'pagos': // payment card
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M3 10 H21" />
          <path d="M6.5 14.5 H10.5" />
        </svg>
      );
    case 'perfil': // student with hachimaki (headband)
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4.2" />
          <path d="M8 7.2 H16" />
          <path d="M16 7.2 Q18 6.4 19 5.2" />
          <path d="M16 7.2 Q18 7.8 18.8 9" />
          <path d="M5 20 Q6.5 14.5 12 14.5 Q17.5 14.5 19 20" />
        </svg>
      );
  }
}

interface Props {
  active: PortalTab;
  onChange: (tab: PortalTab) => void;
}

/**
 * Native bottom tab bar. Rendered only inside the app (see Portal). Sits fixed at
 * the bottom and reserves the gesture-bar safe area via the `pb-safe` utility.
 */
export default function PortalTabs({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-safe">
      <div className="max-w-3xl mx-auto flex">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => {
                void tapLight();
                onChange(t.key);
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <TabIcon tab={t.key} active={isActive} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
