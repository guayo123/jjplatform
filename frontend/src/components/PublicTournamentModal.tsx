import { useEffect, useState } from 'react';
import { academiesApi } from '../api/academies';
import BracketView from './BracketView';
import { seededName } from './bracketShared';
import type { Tournament } from '../types';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'En curso', cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Finalizado', cls: 'bg-gray-100 text-gray-600' },
};

/** Ventana de la página pública con el detalle de un torneo: campeón, participantes y bracket (solo lectura). */
export default function PublicTournamentModal({
  academyId,
  tournamentId,
  onClose,
}: {
  academyId: number;
  tournamentId: number;
  onClose: () => void;
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    academiesApi
      .getTournament(academyId, tournamentId)
      .then((t) => !cancelled && setTournament(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [academyId, tournamentId]);

  // Cierra con Escape y evita que la página de fondo se desplace mientras está abierta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const status = tournament ? STATUS[tournament.status] ?? STATUS.COMPLETED : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del torneo"
        className="relative w-full sm:max-w-4xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto bg-white text-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-white/95 backdrop-blur px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{tournament?.name ?? 'Torneo'}</h2>
            {tournament && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{tournament.date}</span>
                {status && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>}
                {tournament.tipo === 'ABSOLUTO' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Absoluto</span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {!tournament && !error && (
            <div className="py-12 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="py-10 text-center text-gray-500">No se pudo cargar el torneo. Intenta de nuevo más tarde.</p>}

          {tournament && (
            <>
              {tournament.description && <p className="text-sm text-gray-500">{tournament.description}</p>}

              {tournament.status === 'COMPLETED' && tournament.championName && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
                  <span className="text-4xl">🏆</span>
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">Campeón del torneo</p>
                    <p className="text-xl font-bold text-yellow-900">{tournament.championName}</p>
                  </div>
                </div>
              )}

              <section>
                <h3 className="font-semibold mb-2">Participantes ({tournament.participants.length})</h3>
                {tournament.participants.length === 0 ? (
                  <p className="text-sm text-gray-400">Aún no hay participantes inscritos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tournament.participants.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-lg text-sm"
                      >
                        <span className="font-medium text-primary-800">{seededName(p)}</span>
                        {p.belt && <span className="text-xs text-gray-500">{p.belt}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {tournament.matches.length > 0 ? (
                <section>
                  <h3 className="font-semibold mb-3">Bracket y resultados</h3>
                  <BracketView matches={tournament.matches} />
                </section>
              ) : (
                tournament.status === 'OPEN' && (
                  <p className="text-sm text-gray-400">El bracket se publicará cuando comience el torneo.</p>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
