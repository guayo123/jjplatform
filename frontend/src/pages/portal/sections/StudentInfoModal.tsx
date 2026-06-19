import { useEffect, useState } from 'react';
import type { StudentCard } from '../../../types';
import { portalApi } from '../../../api/portal';
import BeltImage from '../../../components/BeltImage';

/** Tapping a name in a ranking opens this card: photo, full name, age, RUT and belt image. */
export default function StudentInfoModal({ viewerId, targetId, onClose }: {
  viewerId: number; targetId: number; onClose: () => void;
}) {
  const [card, setCard] = useState<StudentCard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    portalApi.studentCard(viewerId, targetId)
      .then((c) => { if (alive) setCard(c); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [viewerId, targetId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center jjp-pop">
        <button onClick={onClose} className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        {error ? (
          <p className="py-8 text-sm text-gray-500">No se pudo cargar la información.</p>
        ) : !card ? (
          <p className="py-8 text-sm text-gray-400">Cargando…</p>
        ) : (
          <>
            {card.photoUrl ? (
              <img src={card.photoUrl} alt="" className="mx-auto w-24 h-24 rounded-full object-cover" />
            ) : (
              <span className="mx-auto w-24 h-24 rounded-full bg-gray-200 text-gray-500 text-2xl font-bold flex items-center justify-center">
                {card.name.charAt(0).toUpperCase()}
              </span>
            )}
            <h3 className="mt-3 text-lg font-extrabold text-gray-900">{card.name}</h3>
            {card.nickname && <p className="text-sm text-gray-500 italic">"{card.nickname}"</p>}
            {(card.age != null || card.weight != null) && (
              <p className="mt-1 text-sm text-gray-600">
                {[card.age != null ? `${card.age} años` : null, card.weight != null ? `${card.weight} kg` : null]
                  .filter(Boolean).join(' · ')}
              </p>
            )}
            {card.belt && <div className="mt-4 mx-auto w-40"><BeltImage belt={card.belt} stripes={card.stripes ?? 0} /></div>}
          </>
        )}
      </div>
    </div>
  );
}
