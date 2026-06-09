import { tapLight } from '../../native/haptics';

export type PortalTab = 'entreno' | 'retos' | 'fichas' | 'pagos' | 'perfil';

const TABS: { key: PortalTab; label: string; icon: string }[] = [
  { key: 'entreno', label: 'Entreno', icon: '🔥' },
  { key: 'retos',   label: 'Retos',   icon: '⚔️' },
  { key: 'fichas',  label: 'Fichas',  icon: '🥋' },
  { key: 'pagos',   label: 'Pagos',   icon: '💳' },
  { key: 'perfil',  label: 'Perfil',  icon: '👤' },
];

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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
