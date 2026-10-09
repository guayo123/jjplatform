import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { academiesApi } from '../api/academies';
import LiveBracket from './LiveBracket';
import { roundName, seededName } from './bracketShared';
import {
  currentRound,
  groupKeys,
  groupResults,
  matchNumbers,
  pathOf,
  type GroupResult,
} from '../utils/tournamentSummary';
import type { Tournament } from '../types';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Abierto', cls: 'bg-green-500/15 text-green-300' },
  IN_PROGRESS: { label: 'En vivo', cls: 'bg-red-500/15 text-red-300' },
  COMPLETED: { label: 'Finalizado', cls: 'bg-white/10 text-gray-300' },
};

/** Cada cuántos segundos se vuelve a pedir el torneo mientras no ha terminado (para verlo "en vivo"). */
const POLL_SECONDS = 10;
/** Con más participantes que esto la lista arranca plegada, para no ocupar toda la pantalla en el celular. */
const COLLAPSE_PARTICIPANTS_OVER = 8;

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Qué combates cambiaron de resultado entre dos versiones del torneo (para resaltarlos). */
function changedMatchIds(prev: Tournament | null, next: Tournament): number[] {
  if (!prev) return [];
  const before = new Map(prev.matches.map((m) => [m.id, m.winnerId]));
  return next.matches.filter((m) => before.has(m.id) && before.get(m.id) !== m.winnerId).map((m) => m.id);
}

/**
 * Ventana pública de un torneo, en vivo: bracket en árbol (estilo app de torneos) con pestañas de ronda,
 * y una pestaña de resultados con podio, camino del campeón y participantes. Se actualiza sola mientras el
 * torneo no ha terminado.
 */
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
  const [tab, setTab] = useState<'bracket' | 'results'>('bracket');
  const [group, setGroup] = useState<string | null | undefined>(undefined); // undefined = aún sin elegir
  const [manualRound, setManualRound] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const tournamentRef = useRef<Tournament | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      try {
        const next = await academiesApi.getTournament(academyId, tournamentId);
        const diff = changedMatchIds(tournamentRef.current, next);
        tournamentRef.current = next;
        setTournament(next);
        setUpdatedAt(new Date());
        setError(false);
        if (diff.length > 0) {
          setChanged(new Set(diff));
          window.setTimeout(() => setChanged(new Set()), 6000);
        }
      } catch {
        if (!silent) setError(true); // un fallo en una actualización automática no borra lo que ya se ve
      }
    },
    [academyId, tournamentId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // En vivo: mientras el torneo no termine, se vuelve a pedir cada POLL_SECONDS (solo con la pestaña visible).
  const live = !!tournament && tournament.status !== 'COMPLETED';
  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (!document.hidden) void load(true);
    };
    const id = window.setInterval(tick, POLL_SECONDS * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [live, load]);

  // Cierra con Escape y congela la página de fondo mientras la ventana está abierta. En iOS `overflow: hidden`
  // no basta (al arrastrar fuera de la ventana la página de atrás seguía desplazándose), así que se fija el
  // body en su posición actual y al cerrar se vuelve exactamente al mismo punto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);

    const body = document.body;
    const scrollY = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  const matches = useMemo(() => tournament?.matches ?? [], [tournament]);
  const keys = useMemo(() => groupKeys(matches), [matches]);
  const activeGroup: string | null = group !== undefined && keys.includes(group) ? group : keys[0] ?? null;
  const groupMatches = useMemo(() => matches.filter((m) => (m.categoryGroup ?? null) === activeGroup), [matches, activeGroup]);
  const numbers = useMemo(() => matchNumbers(matches), [matches]);
  const rounds = useMemo(() => [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b), [groupMatches]);

  // Ronda a la vista: la que elige el usuario; si no eligió, la "actual", que avanza sola con los resultados.
  const autoRound = useMemo(() => currentRound(groupMatches), [groupMatches]);
  useEffect(() => setManualRound(null), [autoRound, activeGroup]);
  const round = manualRound ?? autoRound;

  const results = useMemo(() => groupResults(matches), [matches]);
  const isAbsolute = tournament?.tipo === 'ABSOLUTO';
  const championPath = useMemo(
    () => (isAbsolute && results.length === 1 ? pathOf(matches, results[0].champion.id, null) : []),
    [isAbsolute, results, matches],
  );

  const status = tournament ? STATUS[tournament.status] ?? STATUS.COMPLETED : null;
  const participants = tournament?.participants ?? [];
  const collapsed = participants.length > COLLAPSE_PARTICIPANTS_OVER && !showAll;
  const shownParticipants = collapsed ? participants.slice(0, COLLAPSE_PARTICIPANTS_OVER) : participants;

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?torneo=${tournamentId}`;
    const title = tournament ? tournament.name : 'Torneo';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 sm:p-6 overscroll-none" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del torneo"
        className="relative w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden bg-[#0d0d10] text-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-white/10"
        // `dvh` descuenta las barras del navegador del celular (con `vh` la cabecera quedaba tapada y no se podía cerrar);
        // si el navegador no lo entiende se ignora y vale el max-h de arriba.
        style={{ maxHeight: 'min(92dvh, 56rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{tournament?.name ?? 'Torneo'}</h2>
            {tournament && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span>{formatDate(tournament.date)}</span>
                {isAbsolute && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-300">Absoluto</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tournament && (
              <button type="button" onClick={share} aria-label="Compartir torneo" className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/15 text-sm font-medium">
                Compartir
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 text-xl leading-none">
              ×
            </button>
          </div>
        </div>

        {shareMsg && <p className="mx-5 mt-3 text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 break-all">{shareMsg}</p>}

        {/* Resumen */}
        {tournament && (
          <div className="grid grid-cols-3 gap-px bg-white/10 border-b border-white/10 text-center">
            <Stat label="Estado">
              {status && (
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                  {tournament.status === 'IN_PROGRESS' && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                  {status.label}
                </span>
              )}
            </Stat>
            <Stat label="Participantes">
              <span className="text-lg font-bold">{participants.length}</span>
            </Stat>
            <Stat label={live ? 'Actualizado' : 'Combates'}>
              <span className="text-lg font-bold">
                {live
                  ? updatedAt?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '—'
                  : numbers.size}
              </span>
            </Stat>
          </div>
        )}

        {/* Pestañas Bracket / Resultados */}
        {tournament && (
          <div className="flex gap-2 px-5 py-3">
            {(['bracket', 'results'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  tab === t ? 'bg-white/15 border-white/20 text-white' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {t === 'bracket' ? 'Bracket' : 'Resultados'}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          {!tournament && !error && (
            <div className="py-16 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && !tournament && <p className="py-12 text-center text-gray-400">No se pudo cargar el torneo. Intenta de nuevo más tarde.</p>}

          {tournament && tab === 'bracket' && (
            <>
              {tournament.description && <p className="text-sm text-gray-400 mb-3">{tournament.description}</p>}
              {matches.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  {tournament.status === 'OPEN' ? 'El bracket se publicará cuando comience el torneo.' : 'Aún no hay combates.'}
                </p>
              ) : (
                <>
                  {keys.length > 1 && (
                    <select
                      value={activeGroup ?? ''}
                      onChange={(e) => setGroup(e.target.value)}
                      aria-label="Categoría"
                      className="w-full mb-3 bg-white/5 border border-white/15 text-white text-sm rounded-lg px-3 py-2.5"
                    >
                      {keys.map((k) => (
                        <option key={k ?? 'x'} value={k ?? ''} className="text-black">
                          {k}
                        </option>
                      ))}
                    </select>
                  )}
                  <LiveBracket
                    matches={groupMatches}
                    numbers={numbers}
                    activeRound={round}
                    onActiveRoundChange={setManualRound}
                    changedIds={changed}
                  />
                </>
              )}
            </>
          )}

          {tournament && tab === 'results' && (
            <div className="space-y-6 pt-1">
              {results.length > 0 ? (
                <Podium results={results} />
              ) : (
                <p className="text-sm text-gray-500">Los resultados aparecerán cuando se juegue la final.</p>
              )}

              {championPath.length > 0 && (
                <section>
                  <h3 className="font-semibold mb-3">Camino del campeón</h3>
                  <ol className="relative border-l-2 border-yellow-500/30 ml-2 space-y-3">
                    {championPath.map((step) => (
                      <li key={step.round} className="pl-4 relative">
                        <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-[#0d0d10]" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{step.label}</p>
                        <p className="text-sm text-gray-200">
                          {step.bye ? (
                            'Pase directo'
                          ) : (
                            <>
                              Venció a <span className="font-semibold text-white">{step.opponent && seededName(step.opponent)}</span>
                              {step.resultLabel && <span className="text-gray-400"> · {step.resultLabel}</span>}
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
                  <p className="text-sm text-gray-500">Aún no hay participantes inscritos.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {shownParticipants.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm">
                          <span className="font-medium text-gray-100">{seededName(p)}</span>
                          {p.belt && <span className="text-xs text-gray-500">{p.belt}</span>}
                        </span>
                      ))}
                    </div>
                    {participants.length > COLLAPSE_PARTICIPANTS_OVER && (
                      <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-primary-400 hover:text-primary-300">
                        {showAll ? 'Ver menos' : `Ver los ${participants.length} participantes`}
                      </button>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Barra inferior: ronda a la vista (pestañas) y cerrar al alcance del pulgar en el celular */}
        <div className="border-t border-white/10 bg-[#0d0d10] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex items-center gap-2">
          <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto">
            {tournament && tab === 'bracket' && rounds.length > 0
              ? rounds.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setManualRound(r)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      r === round ? 'bg-white/15 border-white/25 text-white' : 'border-white/10 text-gray-400'
                    }`}
                  >
                    {roundName(r, rounds.length)}
                  </button>
                ))
              : null}
          </div>
          <button type="button" onClick={onClose} className="sm:hidden flex-shrink-0 px-4 py-2 rounded-full bg-white text-gray-900 text-sm font-semibold">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d10] py-2.5 px-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      {children}
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
          <div key={r.group ?? 'x'} className="border border-white/10 bg-white/5 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-400 mb-1.5">{r.group}</p>
            <p className="text-sm">
              🥇 <span className="font-bold text-yellow-300">{r.champion.studentName}</span>
              {r.runnerUp && <span className="text-gray-300"> · 🥈 {r.runnerUp.studentName}</span>}
              {r.thirds.length > 0 && <span className="text-gray-400"> · 🥉 {r.thirds.map((p) => p.studentName).join(', ')}</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PodiumRow({ medal, place, names, highlight }: { medal: string; place: string; names: string[]; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${highlight ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
      <span className={highlight ? 'text-4xl' : 'text-2xl'}>{medal}</span>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${highlight ? 'text-yellow-300' : 'text-gray-400'}`}>{place}</p>
        <p className={`${highlight ? 'text-xl font-bold text-yellow-100' : 'text-base font-semibold text-gray-100'} break-words`}>{names.join(' · ')}</p>
      </div>
    </div>
  );
}
