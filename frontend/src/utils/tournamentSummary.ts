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

/** Pase directo: tiene ganador pero solo un luchador. */
export const isBye = (m: BracketMatch) => m.winnerId != null && (!m.participant1 || !m.participant2);
/** Se puede jugar: ya están los dos luchadores y falta el ganador. */
export const isPlayable = (m: BracketMatch) => m.winnerId == null && !!m.participant1 && !!m.participant2;

/**
 * Número de combate (#1, #2…) como en un torneo real: se numeran por categoría, ronda y posición, sin contar
 * los pases directos. Es estable mientras el bracket no se regenere.
 */
export function matchNumbers(matches: BracketMatch[]): Map<number, number> {
  const ordered = [...matches].sort(
    (a, b) =>
      (a.categoryGroup ?? '').localeCompare(b.categoryGroup ?? '') || a.round - b.round || a.matchNumber - b.matchNumber,
  );
  const numbers = new Map<number, number>();
  let n = 0;
  ordered.forEach((m) => {
    if (!isBye(m)) numbers.set(m.id, ++n);
  });
  return numbers;
}

/** Ronda "actual": la primera con combates por jugar; si no hay, la primera con algo pendiente; si no, la final. */
export function currentRound(groupMatches: BracketMatch[]): number {
  const rounds = [...new Set(groupMatches.map((m) => m.round))].sort((a, b) => a - b);
  const firstWith = (pred: (m: BracketMatch) => boolean) =>
    rounds.find((r) => groupMatches.some((m) => m.round === r && pred(m)));
  return (
    firstWith(isPlayable) ??
    firstWith((m) => m.winnerId == null && (!!m.participant1 || !!m.participant2)) ??
    rounds[rounds.length - 1] ??
    1
  );
}

/** Llaves (categorías) del torneo, ordenadas; [null] si es una sola llave (Absoluto). */
export function groupKeys(matches: BracketMatch[]): (string | null)[] {
  return [...byGroup(matches).keys()].sort((a, b) => (a ?? '').localeCompare(b ?? ''));
}
