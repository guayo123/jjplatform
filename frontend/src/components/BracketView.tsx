import { useState } from 'react';
import type { BracketMatch } from '../types';

interface BracketViewProps {
  matches: BracketMatch[];
  onRecordResult?: (matchId: number, winnerId: number, resultType: string) => void;
}

const RESULT_TYPES: { value: string; label: string; short: string; color: string }[] = [
  { value: 'SUMISION',         label: 'Finalización / Sumisión', short: 'Sub',      color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
  { value: 'PUNTOS',           label: 'Puntos',                  short: 'Pts',      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { value: 'VENTAJAS',         label: 'Ventajas',                short: 'Vent',     color: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200' },
  { value: 'PENALIZACIONES',   label: 'Penalizaciones',          short: 'Penal',    color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
  { value: 'DECISION_ARBITRO', label: 'Decisión del Árbitro',    short: 'Árbitro',  color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  { value: 'DESCALIFICACION',  label: 'Descalificación',         short: 'Descalif', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
];

function resultLabel(rt: string | null) {
  return RESULT_TYPES.find((r) => r.value === rt);
}

export default function BracketView({ matches, onRecordResult }: BracketViewProps) {
  const groups = new Map<string, BracketMatch[]>();
  matches.forEach((m) => {
    const key = m.categoryGroup ?? 'Absoluto';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });

  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const showHeaders = sortedGroups.length > 1;

  return (
    <div className="space-y-8">
      {sortedGroups.map(([groupName, groupMatches]) => (
        <GroupBracket
          key={groupName}
          groupName={groupName}
          matches={groupMatches}
          onRecordResult={onRecordResult}
          showHeader={showHeaders}
        />
      ))}
    </div>
  );
}

function GroupBracket({
  groupName,
  matches,
  onRecordResult,
  showHeader,
}: {
  groupName: string;
  matches: BracketMatch[];
  onRecordResult?: (matchId: number, winnerId: number, resultType: string) => void;
  showHeader: boolean;
}) {
  const rounds = new Map<number, BracketMatch[]>();
  matches.forEach((m) => {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  });

  const sortedRounds = [...rounds.entries()].sort(([a], [b]) => a - b);
  const totalRounds = sortedRounds.length;

  const roundLabel = (round: number) => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semifinal';
    if (round === totalRounds - 2) return 'Cuartos';
    return `Ronda ${round}`;
  };

  const maxRound = Math.max(...matches.map((m) => m.round));
  const finalMatches = matches.filter((m) => m.round === maxRound && m.winnerId != null);
  let champion: string | null = null;
  if (finalMatches.length > 0) {
    const fm = finalMatches[0];
    if (fm.winnerId === fm.participant1?.id) champion = fm.participant1?.studentName ?? null;
    else if (fm.winnerId === fm.participant2?.id) champion = fm.participant2?.studentName ?? null;
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700 text-sm">{groupName}</h3>
          {champion && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              🏆 {champion}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-4">
          {sortedRounds.map(([round, roundMatches]) => (
            <div key={round} className="flex flex-col">
              <h4 className="text-sm font-semibold text-gray-500 mb-3 text-center">
                {roundLabel(round)}
              </h4>
              <div className="flex flex-col justify-around flex-1" style={{ gap: `${Math.pow(2, round - 1) * 16}px` }}>
                {roundMatches.sort((a, b) => a.matchNumber - b.matchNumber).map((match) => (
                  <MatchCard key={match.id} match={match} onRecordResult={onRecordResult} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, onRecordResult }: { match: BracketMatch; onRecordResult?: (matchId: number, winnerId: number, resultType: string) => void; }) {
  const [pendingWinnerId, setPendingWinnerId] = useState<number | null>(null);

  const canRecord = !!onRecordResult && !match.winnerId && !!match.participant1 && !!match.participant2;

  const handleParticipantClick = (participantId: number) => {
    if (!canRecord) return;
    setPendingWinnerId(participantId);
  };

  const handleResultType = (resultType: string) => {
    if (pendingWinnerId == null) return;
    onRecordResult!(match.id, pendingWinnerId, resultType);
    setPendingWinnerId(null);
  };

  const rt = resultLabel(match.resultType);

  return (
    <div className="w-56">
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <ParticipantRow
          name={match.participant1?.studentName || 'BYE'}
          participantId={match.participant1?.id}
          isWinner={match.winnerId === match.participant1?.id}
          isPending={pendingWinnerId === match.participant1?.id}
          canClick={canRecord}
          onClick={() => match.participant1 && handleParticipantClick(match.participant1.id)}
        />
        <div className="border-t border-gray-200" />
        <ParticipantRow
          name={match.participant2?.studentName || 'BYE'}
          participantId={match.participant2?.id}
          isWinner={match.winnerId === match.participant2?.id}
          isPending={pendingWinnerId === match.participant2?.id}
          canClick={canRecord}
          onClick={() => match.participant2 && handleParticipantClick(match.participant2.id)}
        />
      </div>
      {match.winnerId && rt && (
        <div className={`mt-1 mx-1 text-center text-xs px-2 py-0.5 rounded border font-medium ${rt.color}`}>
          {rt.label}
        </div>
      )}
      {pendingWinnerId != null && (
        <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
          <p className="text-xs text-gray-500 mb-1.5 font-medium text-center">¿Cómo ganó?</p>
          <div className="flex flex-col gap-1">
            {RESULT_TYPES.map((r) => (
              <button key={r.value} onClick={() => handleResultType(r.value)} className={`w-full text-left text-xs px-2.5 py-1.5 rounded border font-medium transition-colors ${r.color}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => setPendingWinnerId(null)} className="mt-1.5 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ name, participantId, isWinner, isPending, canClick, onClick }: { name: string; participantId?: number; isWinner: boolean; isPending: boolean; canClick: boolean; onClick: () => void; }) {
  const isBye = !participantId;
  return (
    <button
      onClick={onClick}
      disabled={!canClick || isBye}
      className={`w-full px-3 py-2 text-left text-sm transition-colors ${isWinner ? 'bg-green-100 text-green-800 font-semibold' : isPending ? 'bg-primary-100 text-primary-800 font-semibold' : isBye ? 'text-gray-300 italic' : canClick ? 'hover:bg-primary-50 cursor-pointer' : ''}`}
    >
      {name}
    </button>
  );
}
