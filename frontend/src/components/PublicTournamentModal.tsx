import { useEffect, useMemo, useState } from 'react';
import { academiesApi } from '../api/academies';
import BracketView from './BracketView';
import { seededName } from './bracketShared';
import { groupResults, pathOf, type GroupResult } from '../utils/tournamentSummary';
import type { Tournament } from '../types';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'En curso', cls: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Finalizado', cls: 'bg-gray-100 text-gray-600' },
};

/** Con más participantes que esto la lista arranca plegada, para no ocupar toda la pantalla en el celular. */
const COLLAPSE_PARTICIPANTS_OVER = 8;

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Ventana de la página pública con el detalle de un torneo: podio, camino del campeón, participantes y bracket. */
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
  const [showAll, setShowAll] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

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

  const results = useMemo(() => (tournament ? groupResults(tournament.matches) : []), [tournament]);
  const isAbsolute = tournament?.tipo === 'ABSOLUTO';
  const championPath = useMemo(() => {
    if (!tournament || !isAbsolute || results.length !== 1) return [];
    return pathOf(tournament.matches, results[0].champion.id, null);
  }, [tournament, isAbsolute, results]);

  const status = tournament ? STATUS[tournament.status] ?? STATUS.COMPLETED : null;
  const participants = tournament?.participants ?? [];
  const collapsed = participants.length > COLLAPSE_PARTICIPANTS_OVER && !showAll;
  const shownParticipants = collapsed ? participants.slice(0, COLLAPSE_PARTICIPANTS_OVER) : participants;

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?torneo=${tournamentId}`;
    const title = tournament ? `${tournament.name}` : 'Torneo';
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Mira el bracket y los resultados de ${title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg('¡Enlace copiado!');
    } catch {
      // El usuario canceló el menú de compartir, o el navegador no permite copiar.
      if (!navigator.share) setShareMsg(url);
    }
    window.setTimeout(() => setShareMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del torneo"
        className="relative w-full sm:max-w-4xl max-h-[88vh] sm:max-h-[90vh] overflow-y-auto bg-white text-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl"
        // `dvh` descuenta las barras del navegador del celular (con `vh` la cabecera quedaba tapada y no se podía cerrar);
        // si el navegador no lo entiende se ignora y vale el max-h de arriba.
        style={{ maxHeight: 'min(88dvh, 52rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-white/95 backdrop-blur px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{tournament?.name ?? 'Torneo'}</h2>
            {tournament && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{formatDate(tournament.date)}</span>
                {status && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>}
                {isAbsolute && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">Absoluto</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tournament && (
              <button
                type="button"
                onClick={share}
                aria-label="Compartir torneo"
                className="h-10 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
              >
                Compartir
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {shareMsg && (
          <p className="mx-5 mt-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 break-all">{shareMsg}</p>
        )}

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

              {results.length > 0 && <Podium results={results} />}

              {championPath.length > 0 && (
                <section>
                  <h3 className="font-semibold mb-3">Camino del campeón</h3>
                  <ol className="relative border-l-2 border-yellow-200 ml-2 space-y-3">
                    {championPath.map((step) => (
                      <li key={step.round} className="pl-4 relative">
                        <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{step.label}</p>
                        <p className="text-sm text-gray-800">
                          {step.bye ? (
                            'Pase directo'
                          ) : (
                            <>
                              Venció a <span className="font-semibold">{step.opponent && seededName(step.opponent)}</span>
                              {step.resultLabel && <span className="text-gray-500"> · {step.resultLabel}</span>}
                            </>
                          )}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section>
                <h3 className="font-semibold mb-2">Participantes ({participants.length})</h3>
                {participants.length === 0 ? (
                  <p className="text-sm text-gray-400">Aún no hay participantes inscritos.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {shownParticipants.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-lg text-sm"
                        >
                          <span className="font-medium text-primary-800">{seededName(p)}</span>
                          {p.belt && <span className="text-xs text-gray-500">{p.belt}</span>}
                        </span>
                      ))}
                    </div>
                    {participants.length > COLLAPSE_PARTICIPANTS_OVER && (
                      <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {showAll ? 'Ver menos' : `Ver los ${participants.length} participantes`}
                      </button>
                    )}
                  </>
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

        {/* Cerrar al alcance del pulgar en el celular */}
        <div className="sm:hidden sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button type="button" onClick={onClose} className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Podio: llave única (Absoluto) o una fila por categoría. */
function Podium({ results }: { results: GroupResult[] }) {
  const single = results.length === 1 && results[0].group === null;

  if (single) {
    const r = results[0];
    return (
      <section>
        <h3 className="font-semibold mb-3">Podio</h3>
        <div className="space-y-2">
          <PodiumRow medal="🥇" place="Campeón" names={[r.champion.studentName]} highlight />
          {r.runnerUp && <PodiumRow medal="🥈" place="Segundo lugar" names={[r.runnerUp.studentName]} />}
          {r.thirds.length > 0 && <PodiumRow medal="🥉" place="Tercer lugar" names={r.thirds.map((p) => p.studentName)} />}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-semibold mb-3">Campeones por categoría</h3>
      <div className="space-y-2">
        {results.map((r) => (
          <div key={r.group ?? 'x'} className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">{r.group}</p>
            <p className="text-sm">
              🥇 <span className="font-bold text-yellow-800">{r.champion.studentName}</span>
              {r.runnerUp && <span className="text-gray-600"> · 🥈 {r.runnerUp.studentName}</span>}
              {r.thirds.length > 0 && <span className="text-gray-500"> · 🥉 {r.thirds.map((p) => p.studentName).join(', ')}</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PodiumRow({ medal, place, names, highlight }: { medal: string; place: string; names: string[]; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        highlight ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'
      }`}
    >
      <span className={highlight ? 'text-4xl' : 'text-2xl'}>{medal}</span>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${highlight ? 'text-yellow-700' : 'text-gray-500'}`}>{place}</p>
        <p className={`${highlight ? 'text-xl font-bold text-yellow-900' : 'text-base font-semibold text-gray-800'} break-words`}>
          {names.join(' · ')}
        </p>
      </div>
    </div>
  );
}
