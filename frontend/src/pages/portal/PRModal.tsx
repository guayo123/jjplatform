import { useEffect, useMemo } from 'react';
import { tapHeavy, tapLight } from '../../native/haptics';
import type { PR } from './prDetection';

const CONFETTI_COLORS = ['#F59E0B', '#EF4444', '#FB923C', '#22C55E', '#FCD34D', '#FDBA74'];

interface Props {
  prs: PR[];
  onClose: () => void;
}

export default function PRModal({ prs, onClose }: Props) {
  useEffect(() => {
    void tapLight();
    const t = window.setTimeout(() => { void tapHeavy(); }, 400);
    return () => window.clearTimeout(t);
  }, []);

  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2 + Math.random() * 1.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 5,
        rotate: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-gray-900/90 backdrop-blur-sm pt-safe pb-safe">
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-20px] rounded-sm jjp-confetti"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ['--rot' as string]: `${p.rotate}deg`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl jjp-pop">
        <p className="jjp-rise text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
          Récord personal
        </p>
        <div className="jjp-flame-glow my-2 text-5xl">🏆</div>
        <p className="jjp-rise mt-1 text-lg font-extrabold text-gray-900">
          {prs.length === 1 ? '¡Nuevo PR!' : `¡${prs.length} PRs en una sesión!`}
        </p>

        <div className="mt-4 space-y-2 text-left">
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{pr.exerciseName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold text-orange-600">{pr.weightKg} kg</p>
                <p className="text-[11px] text-gray-400">antes {pr.prevBest} kg</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="jjp-rise mt-6 w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
          style={{ animationDelay: '600ms' }}
        >
          ¡A romperlos!
        </button>
      </div>
    </div>
  );
}
