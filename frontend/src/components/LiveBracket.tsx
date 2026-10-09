import { useEffect, useMemo, useRef } from 'react';
import type { BracketMatch, Participant } from '../types';
import { roundName } from './bracketShared';
import { isBye, isPlayable } from '../utils/tournamentSummary';

/**
 * Árbol de llaves de solo lectura para la página pública (estilo app de torneos): tarjetas oscuras con número de
 * combate y tipo de victoria, líneas que unen cada combate con el siguiente, y una ronda por columna con
 * desplazamiento lateral (la ronda siguiente asoma en el celular).
 */

const SLOT_H = 116; // alto de cada "slot" de la primera ronda
const HEADER_H = 32;
const COL_W = 'w-[min(88vw,22rem)] sm:w-[22rem]';
const PAD = 20; // padding lateral del contenedor (px-5)

const RESULT_SHORT: Record<string, string> = {
  SUMISION: 'Sumisión',
  PUNTOS: 'Puntos',
  VENTAJAS: 'Ventajas',
  PENALIZACIONES: 'Penaliz.',
  DECISION_ARBITRO: 'Árbitro',
  DESCALIFICACION: 'Descalif.',
};

/** Color del punto según el cinturón (los nombres varían: "Blanca"/"Blanco", "Morada"/"Morado"…). */
function beltDot(belt: string): string {
  const b = belt.toLowerCase();
  if (b.startsWith('blanc')) return 'bg-white';
  if (b.startsWith('azul')) return 'bg-blue-500';
  if (b.startsWith('morad')) return 'bg-purple-500';
  if (b.startsWith('marr')) return 'bg-amber-800';
  if (b.startsWith('negr')) return 'bg-black ring-1 ring-white/60';
  if (b.startsWith('gris')) return 'bg-gray-400';
  if (b.startsWith('amar')) return 'bg-yellow-400';
  if (b.startsWith('naranj')) return 'bg-orange-500';
  if (b.startsWith('verd')) return 'bg-green-500';
  if (b.startsWith('roj') || b.startsWith('coral')) return 'bg-red-500';
  return 'bg-gray-500';
}

function initials(name: string) {
  // Con nombre completo se usa la primera letra del nombre y del primer apellido ("Diego Andrés Rivas Palma" → DR).
  const parts = name.replace('.', '').trim().split(/\s+/);
  const second = parts.length >= 3 ? parts[parts.length - 2] : parts[1];
  return ((parts[0]?.[0] ?? '') + (second?.[0] ?? '')).toUpperCase() || '?';
}

export default function LiveBracket({
  matches,
  numbers,
  activeRound,
  onActiveRoundChange,
  changedIds,
}: {
  /** Combates de UNA llave (todo el torneo si es Absoluto, o una categoría). */
  matches: BracketMatch[];
  numbers: Map<number, number>;
  activeRound: number;
  onActiveRoundChange: (round: number) => void;
  /** Combates cuyo resultado cambió hace poco (se resaltan). */
  changedIds: Set<number>;
}) {
  const rounds = useMemo(() => [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b), [matches]);
  const byRound = useMemo(
    () => rounds.map((r) => matches.filter((m) => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber)),
    [rounds, matches],
  );
  const firstRoundSlots = Math.max(1, byRound[0]?.length ?? 1);
  const treeHeight = firstRoundSlots * SLOT_H;

  const containerRef = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const firstScroll = useRef(true);

  // Cuando la ronda activa cambia desde afuera (pestañas de abajo) se desplaza hasta esa columna.
  useEffect(() => {
    const box = containerRef.current;
    const col = box?.querySelector<HTMLElement>(`[data-col="${activeRound}"]`);
    if (!box || !col) return;
    const target = col.offsetLeft - PAD;
    if (Math.abs(box.scrollLeft - target) < 4) return;
    programmatic.current = true;
    box.scrollTo({ left: target, behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
    const t = window.setTimeout(() => (programmatic.current = false), 700);
    return () => window.clearTimeout(t);
  }, [activeRound, rounds.length]);

  // Cuando el usuario desliza con el dedo, informa qué ronda quedó a la vista.
  const frame = useRef<number | null>(null);
  const onScroll = () => {
    if (programmatic.current || frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const box = containerRef.current;
      if (!box) return;
      let best = rounds[0];
      let bestDist = Infinity;
      box.querySelectorAll<HTMLElement>('[data-col]').forEach((el) => {
        const dist = Math.abs(el.offsetLeft - PAD - box.scrollLeft);
        if (dist < bestDist) {
          bestDist = dist;
          best = Number(el.dataset.col);
        }
      });
      if (best !== undefined && best !== activeRound) onActiveRoundChange(best);
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="relative -mx-5 overflow-x-auto overscroll-x-contain pb-4 snap-x snap-mandatory"
      style={{ scrollPaddingLeft: PAD }}
    >
      <div className="inline-block min-w-full" style={{ paddingLeft: PAD, paddingRight: PAD }}>
        {/* Títulos de ronda */}
        <div className="flex" style={{ gap: 'var(--lb-gap, 36px)', height: HEADER_H }}>
          {rounds.map((r) => (
            <div key={r} className={`${COL_W} flex-shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-gray-400`}>
              {roundName(r, rounds.length)}
            </div>
          ))}
        </div>

        <div className="lb-tree" style={{ height: treeHeight }}>
          {byRound.map((roundMatches, i) => (
            <div
              key={rounds[i]}
              data-col={rounds[i]}
              className={`lb-col ${COL_W} snap-start ${i < rounds.length - 1 ? 'lb-next' : ''} ${i > 0 ? 'lb-prev' : ''}`}
            >
              {roundMatches.map((m, idx) => (
                <div key={m.id} className={`lb-slot px-0 ${idx % 2 === 0 ? 'lb-top' : 'lb-bottom'}`}>
                  <MatchCard match={m} number={numbers.get(m.id)} flash={changedIds.has(m.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, number, flash }: { match: BracketMatch; number?: number; flash: boolean }) {
  const bye = isBye(match);
  const playable = isPlayable(match);
  const decided = match.winnerId != null;
  const result = decided && match.resultType ? RESULT_SHORT[match.resultType] ?? match.resultType : null;

  return (
    <div className={`lb-card rounded-xl bg-[#1b1b1f] border border-white/10 ${flash ? 'lb-flash' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0 space-y-2">
          <Fighter p={match.participant1} winner={decided && match.winnerId === match.participant1?.id} decided={decided} bye={bye} />
          <Fighter p={match.participant2} winner={decided && match.winnerId === match.participant2?.id} decided={decided} bye={bye} />
        </div>
        <div className="w-[4.25rem] flex-shrink-0 text-center">
          {number !== undefined && <p className="text-xs font-semibold text-gray-400">#{number}</p>}
          {bye ? (
            <span className="mt-1 inline-block text-[11px] font-semibold text-gray-400 bg-white/5 rounded px-1.5 py-1">Pase directo</span>
          ) : result ? (
            <span className="mt-1 inline-block text-[11px] font-bold text-green-400 bg-green-500/15 rounded px-1.5 py-1">{result}</span>
          ) : decided ? (
            <span className="mt-1 inline-block text-[11px] font-bold text-green-400 bg-green-500/15 rounded px-1.5 py-1">Ganó</span>
          ) : playable ? (
            <span className="mt-1 inline-block text-[11px] font-semibold text-amber-300 bg-amber-400/15 rounded px-1.5 py-1">Por jugar</span>
          ) : (
            <span className="mt-1 inline-block text-[11px] text-gray-500">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Fighter({ p, winner, decided, bye }: { p: Participant | null; winner: boolean; decided: boolean; bye: boolean }) {
  if (!p) {
    return (
      <div className="flex items-center gap-2.5 h-8">
        <span className="w-8 h-8 rounded-full bg-white/5 text-gray-500 text-xs flex items-center justify-center flex-shrink-0">{bye ? '·' : '?'}</span>
        <span className="text-sm italic text-gray-500 truncate">{bye ? 'BYE' : 'Por definir'}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 h-8">
      <span
        className={`relative w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0 ${
          winner ? 'ring-2 ring-green-400 text-green-300 bg-green-500/10' : 'bg-white/10 text-gray-200'
        }`}
      >
        {initials(p.studentName)}
        {winner && (
          <span className="absolute -right-1 -bottom-1 w-3.5 h-3.5 rounded-full bg-green-400 text-[9px] leading-none text-black flex items-center justify-center font-bold">
            ✓
          </span>
        )}
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className={`block text-sm font-medium truncate ${winner ? 'text-green-400' : decided ? 'text-gray-400' : 'text-white'}`}
          title={p.studentName}
        >
          {p.seedRank != null && <span className="text-yellow-400 mr-1">⭐{p.seedRank}</span>}
          {p.studentName}
        </span>
        {p.belt && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${beltDot(p.belt)}`} />
            <span className="truncate">{p.belt}</span>
          </span>
        )}
      </span>
    </div>
  );
}
