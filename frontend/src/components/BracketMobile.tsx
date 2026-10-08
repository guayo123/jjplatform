import { useEffect, useState } from 'react';
import type { BracketMatch } from '../types';
import { RESULT_TYPES, resultLabel, roundName, seededName, type ResultHandler } from './bracketShared';

/**
 * Vista del bracket pensada para celular: una ronda a la vez (pestañas), tarjetas a todo el ancho,
 * los pases directos (BYE) resumidos en una línea y el resultado se elige en una ventana inferior.
 */

/** Pase directo: tiene ganador pero solo un luchador. */
const isBye = (m: BracketMatch) => m.winnerId != null && (!m.participant1 || !m.participant2);
/** Se puede registrar: ya están los dos luchadores y falta el ganador. */
const isPlayable = (m: BracketMatch) => m.winnerId == null && !!m.participant1 && !!m.participant2;

export default function MobileGroup({
  groupName,
  matches,
  onRecordResult,
  showHeader,
}: {
  groupName: string;
  matches: BracketMatch[];
  onRecordResult?: ResultHandler;
  showHeader: boolean;
}) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length;
  const maxRound = rounds[rounds.length - 1];

  // Ronda "actual": la primera con combates por jugar; si no hay, la primera con algo pendiente; si no, la final.
  const firstWith = (pred: (m: BracketMatch) => boolean) =>
    rounds.find((r) => matches.some((m) => m.round === r && pred(m)));
  const autoRound =
    firstWith(isPlayable) ??
    firstWith((m) => m.winnerId == null && (!!m.participant1 || !!m.participant2)) ??
    maxRound;

  // Si el usuario elige una pestaña la respetamos, hasta que la ronda "actual" avance sola.
  const [manualRound, setManualRound] = useState<number | null>(null);
  useEffect(() => setManualRound(null), [autoRound]);
  const round = manualRound ?? autoRound;

  const hasPending = matches.some(isPlayable);
  const [open, setOpen] = useState(!showHeader || hasPending);

  const finalMatch = matches.find((m) => m.round === maxRound && m.winnerId != null);
  const champion = finalMatch
    ? finalMatch.winnerId === finalMatch.participant1?.id
      ? finalMatch.participant1
      : finalMatch.participant2
    : null;

  const inRound = matches.filter((m) => m.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
  const byes = inRound.filter(isBye);
  const regular = inRound.filter((m) => !isBye(m));
  const toPlay = regular.filter(isPlayable);
  const waiting = regular.filter((m) => m.winnerId == null && !isPlayable(m));
  const done = regular.filter((m) => m.winnerId != null);

  return (
    <div className={showHeader ? 'border border-gray-200 rounded-xl overflow-hidden' : ''}>
      {showHeader && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-700 truncate">{groupName}</span>
            {champion && <span className="block text-xs text-yellow-700">🏆 {champion.studentName}</span>}
          </span>
          <span className="flex items-center gap-2 flex-shrink-0">
            {hasPending && (
              <span className="text-[11px] font-semibold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                {matches.filter(isPlayable).length} por jugar
              </span>
            )}
            <span className="text-gray-400">{open ? '▲' : '▼'}</span>
          </span>
        </button>
      )}

      {open && (
        <div className={showHeader ? 'p-3' : ''}>
          {/* Pestañas de ronda */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {rounds.map((r) => {
              const pending = matches.filter((m) => m.round === r && isPlayable(m)).length;
              const active = r === round;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setManualRound(r)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                    active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {roundName(r, totalRounds)}
                  {pending > 0 && (
                    <span
                      className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/25 text-white' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 mt-2">
            {byes.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-600">Pasan directo: </span>
                {byes.map((m) => seededName((m.participant1 ?? m.participant2)!)).join(' · ')}
              </div>
            )}

            <MatchSection title="Por jugar" matches={toPlay} onRecordResult={onRecordResult} />
            <MatchSection title="Esperando rivales" matches={waiting} />
            <MatchSection title="Terminados" matches={done} />

            {regular.length === 0 && byes.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin combates en esta ronda.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchSection({
  title,
  matches,
  onRecordResult,
}: {
  title: string;
  matches: BracketMatch[];
  onRecordResult?: ResultHandler;
}) {
  const [pending, setPending] = useState<{ matchId: number; winnerId: number; winnerName: string } | null>(null);
  if (matches.length === 0) return null;

  const choose = (resultType: string) => {
    if (!pending || !onRecordResult) return;
    onRecordResult(pending.matchId, pending.winnerId, resultType);
    setPending(null);
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
        {title} ({matches.length})
      </h4>
      <div className="space-y-2.5">
        {matches.map((m) => (
          <MobileMatch
            key={m.id}
            match={m}
            canRecord={!!onRecordResult && isPlayable(m)}
            onPick={(winnerId, winnerName) => setPending({ matchId: m.id, winnerId, winnerName })}
            pendingWinnerId={pending?.matchId === m.id ? pending.winnerId : null}
          />
        ))}
      </div>

      {/* Ventana inferior para elegir cómo ganó (no mueve el resto de la pantalla) */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPending(null)}>
          <div
            className="w-full bg-white rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-500 text-center">Ganador</p>
            <p className="text-base font-bold text-gray-900 text-center mb-3">{pending.winnerName}</p>
            <p className="text-sm font-medium text-gray-600 text-center mb-2">¿Cómo ganó?</p>
            <div className="grid grid-cols-1 gap-2">
              {RESULT_TYPES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => choose(r.value)}
                  className={`w-full text-left text-sm px-4 py-3 rounded-lg border font-medium ${r.color}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPending(null)} className="mt-3 w-full text-sm text-gray-500 py-2">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileMatch({
  match,
  canRecord,
  onPick,
  pendingWinnerId,
}: {
  match: BracketMatch;
  canRecord: boolean;
  onPick: (winnerId: number, winnerName: string) => void;
  pendingWinnerId: number | null;
}) {
  const rt = resultLabel(match.resultType);
  const rows = [match.participant1, match.participant2];

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {rows.map((p, i) => {
          const winner = !!p && match.winnerId === p.id;
          const picked = !!p && pendingWinnerId === p.id;
          const tone = winner
            ? 'bg-green-100 text-green-800 font-semibold'
            : picked
            ? 'bg-primary-100 text-primary-800 font-semibold'
            : !p
            ? 'text-gray-400 italic'
            : match.winnerId != null
            ? 'text-gray-400'
            : 'text-gray-900';
          return (
            <button
              key={i}
              type="button"
              disabled={!canRecord || !p}
              onClick={() => p && onPick(p.id, p.studentName)}
              className={`w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left text-[15px] ${
                i === 1 ? 'border-t border-gray-100' : ''
              } ${tone} ${canRecord && p ? 'active:bg-primary-50' : ''}`}
            >
              <span className="min-w-0 break-words">{p ? seededName(p) : 'Por definir'}</span>
              {winner && <span aria-hidden>✓</span>}
            </button>
          );
        })}
      </div>
      {canRecord && <p className="mt-1 text-[11px] text-gray-400 text-center">Toca al ganador</p>}
      {match.winnerId != null && rt && (
        <div className={`mt-1 mx-1 text-center text-xs px-2 py-0.5 rounded border font-medium ${rt.color}`}>
          {rt.label}
        </div>
      )}
    </div>
  );
}
