import type { BracketMatch, Participant } from '../types';
import { resultLabel, roundName } from '../components/bracketShared';

/** Podio de una llave (todo el torneo si es Absoluto, o una categoría). */
export interface GroupResult {
  /** Nombre de la categoría; null en torneos Absoluto (llave única). */
  group: string | null;
  champion: Participant;
  runnerUp: Participant | null;
  /** Semifinalistas eliminados (3.er lugar). */
  thirds: Participant[];
}

const loserOf = (m: BracketMatch): Participant | null => {
  if (m.winnerId == null || !m.participant1 || !m.participant2) return null;
  return m.winnerId === m.participant1.id ? m.participant2 : m.participant1;
};

const winnerOf = (m: BracketMatch): Participant | null => {
  if (m.winnerId == null) return null;
  if (m.participant1?.id === m.winnerId) return m.participant1;
  if (m.participant2?.id === m.winnerId) return m.participant2;
  return null;
};

function byGroup(matches: BracketMatch[]) {
  const groups = new Map<string | null, BracketMatch[]>();
  matches.forEach((m) => {
    const key = m.categoryGroup ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });
  return groups;
}

/** Podio de cada llave que ya tiene su final decidida. */
export function groupResults(matches: BracketMatch[]): GroupResult[] {
  const results: GroupResult[] = [];
  byGroup(matches).forEach((groupMatches, group) => {
    const maxRound = Math.max(...groupMatches.map((m) => m.round));
    const final = groupMatches.find((m) => m.round === maxRound && m.winnerId != null);
    const champion = final ? winnerOf(final) : null;
    if (!final || !champion) return;
    const thirds = groupMatches
      .filter((m) => m.round === maxRound - 1)
      .map(loserOf)
      .filter((p): p is Participant => p !== null);
    results.push({ group, champion, runnerUp: loserOf(final), thirds });
  });
  return results.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? ''));
}

export interface PathStep {
  round: number;
  label: string;
  /** Pase directo (sin rival). */
  bye: boolean;
  opponent: Participant | null;
  resultLabel: string | null;
}

/** Combates de un luchador a lo largo de una llave, de la primera ronda a la final. */
export function pathOf(matches: BracketMatch[], participantId: number, group: string | null = null): PathStep[] {
  const groupMatches = matches.filter((m) => (m.categoryGroup ?? null) === group);
  const totalRounds = new Set(groupMatches.map((m) => m.round)).size;
  return groupMatches
    .filter((m) => m.participant1?.id === participantId || m.participant2?.id === participantId)
    .sort((a, b) => a.round - b.round)
    .map((m) => {
      const opponent = m.participant1?.id === participantId ? m.participant2 : m.participant1;
      return {
        round: m.round,
        label: roundName(m.round, totalRounds),
        bye: !opponent,
        opponent,
        resultLabel: opponent ? resultLabel(m.resultType)?.label ?? null : null,
      };
    });
}
