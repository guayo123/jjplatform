import type { BracketMatch } from '../types';

interface BracketViewProps {
  matches: BracketMatch[];
  onRecordResult?: (matchId: number, winnerId: number) => void;
}

export default function BracketView({ matches, onRecordResult }: BracketViewProps) {
  // Group matches by round
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

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max">
        {sortedRounds.map(([round, roundMatches]) => (
          <div key={round} className="flex flex-col">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 text-center">
              {roundLabel(round)}
            </h3>
            <div
              className="flex flex-col justify-around flex-1"
              style={{ gap: `${Math.pow(2, round - 1) * 16}px` }}
            >
              {roundMatches
                .sort((a, b) => a.matchNumber - b.matchNumber)
                .map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onRecordResult={onRecordResult}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onRecordResult,
}: {
  match: BracketMatch;
  onRecordResult?: (matchId: number, winnerId: number) => void;
}) {
  const canRecord =
    onRecordResult &&
    !match.winnerId &&
    match.participant1 &&
    match.participant2;

  return (
    <div className="w-52 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <ParticipantRow
        name={match.participant1?.studentName || 'BYE'}
        participantId={match.participant1?.id}
        isWinner={match.winnerId === match.participant1?.id}
        canClick={!!canRecord}
        onClick={() => {
          if (canRecord && match.participant1) {
            onRecordResult(match.id, match.participant1.id);
          }
        }}
      />
      <div className="border-t border-gray-200" />
      <ParticipantRow
        name={match.participant2?.studentName || 'BYE'}
        participantId={match.participant2?.id}
        isWinner={match.winnerId === match.participant2?.id}
        canClick={!!canRecord}
        onClick={() => {
          if (canRecord && match.participant2) {
            onRecordResult(match.id, match.participant2.id);
          }
        }}
      />
    </div>
  );
}

function ParticipantRow({
  name,
  participantId,
  isWinner,
  canClick,
  onClick,
}: {
  name: string;
  participantId?: number;
  isWinner: boolean;
  canClick: boolean;
  onClick: () => void;
}) {
  const isBye = !participantId;

  return (
    <button
      onClick={onClick}
      disabled={!canClick || isBye}
      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
        isWinner
          ? 'bg-green-100 text-green-800 font-semibold'
          : isBye
          ? 'text-gray-300 italic'
          : canClick
          ? 'hover:bg-primary-50 cursor-pointer'
          : ''
      }`}
    >
      {name}
    </button>
  );
}
