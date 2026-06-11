import { useEffect, useMemo, useRef, useState } from 'react';
import { tapHeavy, tapLight } from '../../native/haptics';

const CONFETTI_COLORS = ['#F59E0B', '#EF4444', '#FB923C', '#22C55E', '#FCD34D', '#FDBA74'];

export interface CelebrationContent {
  /** Small uppercase label above the emoji, e.g. "Racha en marcha". */
  eyebrow: string;
  /** Hero emoji that pulses with a glow, e.g. 🔥 or 🏆. */
  emoji: string;
  /** The number that counts up from 0 (streak days, sessions this week, …). */
  count: number;
  /** Label under the number, e.g. "días seguidos entrenando". */
  unit: string;
  /** Headline congratulation / milestone line. */
  message: string;
  /** Dismiss button text. */
  buttonLabel?: string;
}

interface Props extends CelebrationContent {
  onClose: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Reusable full-screen achievement celebration. The sequence is orchestrated, not
 * simultaneous: eyebrow → emoji (glow) → the number counts up from 0 → confetti bursts
 * as it lands → message → button. Haptics (light on enter, heavy on landing) make it
 * feel native. Honors prefers-reduced-motion by showing the final state without motion.
 */
export default function Celebration({ eyebrow, emoji, count, unit, message, buttonLabel = '¡A seguir!', onClose }: Props) {
  const reduced = useMemo(prefersReducedMotion, []);
  const [value, setValue] = useState(reduced ? count : 0);
  const [landed, setLanded] = useState(reduced);
  const landedHaptic = useRef(false);

  // Soft tap as the curtain opens.
  useEffect(() => {
    void tapLight();
  }, []);

  // Count up 0 → count with easeOutCubic, then mark the landing.
  useEffect(() => {
    if (reduced) return;
    const duration = Math.min(1600, Math.max(550, count * 130));
    const startDelay = 250; // let the eyebrow/emoji read first
    let raf = 0;
    let startTs = 0;
    const tick = (now: number) => {
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * count));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setLanded(true);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [count, reduced]);

  // Heavy punch the moment the number lands and the confetti bursts.
  useEffect(() => {
    if (landed && !landedHaptic.current) {
      landedHaptic.current = true;
      void tapHeavy();
    }
  }, [landed]);

  // Confetti pieces are stable per mount and only render once the number lands.
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    [],
  );

  const showConfetti = landed && !reduced;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-gray-900/90 backdrop-blur-sm pt-safe pb-safe">
      {/* Confetti layer (only after the number lands) */}
      {showConfetti && (
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
      )}

      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl jjp-pop">
        <p className="jjp-rise text-xs font-bold uppercase tracking-[0.2em] text-orange-500" style={{ animationDelay: '0ms' }}>
          {eyebrow}
        </p>

        <div className="jjp-flame-glow my-3 text-6xl" style={{ animationDelay: '150ms' }}>
          {emoji}
        </div>

        {/* Count-up number */}
        <div className="jjp-rise" style={{ animationDelay: '120ms' }}>
          <span className="text-7xl font-extrabold leading-none text-gray-900 tabular-nums">{value}</span>
          <p className="mt-1 text-base font-semibold text-gray-500">{unit}</p>
        </div>

        <p className="jjp-rise mt-5 text-lg font-bold text-orange-600" style={{ animationDelay: '900ms' }}>
          {message}
        </p>

        <button
          onClick={onClose}
          className="jjp-rise mt-7 w-full rounded-xl bg-primary-600 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
          style={{ animationDelay: '1100ms' }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

/** Milestone copy for a day-streak — falls back to a generic line. */
export function streakMessage(days: number): string {
  const MILESTONES: Record<number, string> = {
    1: '¡Arrancaste tu racha!',
    3: '¡Vas tomando ritmo!',
    5: '¡Cinco días al hilo!',
    7: '¡Una semana seguida! 🗓️',
    14: '¡Dos semanas imparable!',
    21: '¡Tres semanas de fuego!',
    30: '¡Un mes entero! 🏆',
    60: '¡Dos meses! Bestia 🦈',
    100: '¡100 días! Leyenda 🐉',
  };
  return MILESTONES[days] ?? '¡Día sumado a tu racha!';
}
