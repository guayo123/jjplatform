import { useEffect, useMemo } from 'react';
import BeltImage from '../../components/BeltImage';
import { notifySuccess } from '../../native/haptics';
import { playOss } from '../../native/sound';
import type { BeltPromotion } from '../../types';

const CONFETTI_COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#22C55E', '#8B5CF6', '#FCD34D', '#EC4899'];

interface Props {
  promotion: BeltPromotion;
  onClose: () => void;
}

/**
 * Full-screen celebration shown when the academy registers a new belt promotion or
 * grade for the student. Confetti is pure CSS (transform/opacity only) so it stays
 * smooth inside the Android WebView on mid-range phones.
 */
export default function PromotionCelebration({ promotion, onClose }: Props) {
  useEffect(() => { void notifySuccess(); playOss(); }, []);

  // Stable random confetti pieces for this mount.
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    [],
  );

  // A grade promotion keeps the belt and adds stripes; a belt promotion changes the belt itself.
  const isGrade = promotion.type === 'GRADO' || promotion.fromBelt === promotion.toBelt;
  const title = isGrade ? '¡Nuevo grado!' : '¡Ascendiste de cinturón!';
  const emoji = isGrade ? '⭐' : '🥋';
  const fromStripes = promotion.fromStripes ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-gray-900/90 backdrop-blur-sm pt-safe pb-safe">
      {/* Confetti layer */}
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
        <div className="text-5xl mb-2">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
        {promotion.disciplineName && (
          <p className="text-sm text-primary-600 font-medium mt-0.5">{promotion.disciplineName}</p>
        )}

        <div className="my-6 px-2">
          <BeltImage belt={promotion.toBelt} stripes={promotion.toStripes} />
        </div>

        <p className="text-gray-700 font-semibold">
          {isGrade ? (
            <>
              {promotion.toBelt}
              <span className="text-primary-600">
                {' · '}
                {fromStripes > 0 ? `${fromStripes}° → ` : ''}{promotion.toStripes}° grado
              </span>
            </>
          ) : (
            <>{promotion.fromBelt ? `${promotion.fromBelt} → ` : ''}{promotion.toBelt}</>
          )}
        </p>
        {promotion.notes && <p className="text-sm text-gray-400 italic mt-2">"{promotion.notes}"</p>}
        <p className="text-xs text-gray-400 mt-3">¡Felicitaciones por tu esfuerzo en el tatami! 🙌</p>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          ¡Gracias!
        </button>
      </div>
    </div>
  );
}
