import client from './client';
import type { CreateDuelRequest, Duel, DuelCloseReason, DuelRankingEntry, DuelResultRequest } from '../types';

export const duelsApi = {
  /** Duels involving the student (incoming + outgoing). */
  mine: (studentId: number) =>
    client.get<Duel[]>(`/portal/students/${studentId}/duels`).then((r) => r.data),

  /** Academy feed: completed (with winner) + rejected duels. */
  feed: (studentId: number) =>
    client.get<Duel[]>(`/portal/students/${studentId}/duels/feed`).then((r) => r.data),

  /** Top-10 academy duel ranking by win/loss record. */
  ranking: (studentId: number) =>
    client.get<DuelRankingEntry[]>(`/portal/students/${studentId}/duels/ranking`).then((r) => r.data),

  create: (studentId: number, data: CreateDuelRequest) =>
    client.post<Duel>(`/portal/students/${studentId}/duels`, data).then((r) => r.data),

  respond: (studentId: number, duelId: number, accept: boolean) =>
    client.post<Duel>(`/portal/students/${studentId}/duels/${duelId}/respond`, { accept }).then((r) => r.data),

  reportResult: (studentId: number, duelId: number, data: DuelResultRequest) =>
    client.post<Duel>(`/portal/students/${studentId}/duels/${duelId}/result`, data).then((r) => r.data),

  cancel: (studentId: number, duelId: number) =>
    client.delete<void>(`/portal/students/${studentId}/duels/${duelId}`).then((r) => r.data),

  /** A participant closes an accepted bout that won't be fought (chickened out / postponed). */
  close: (studentId: number, duelId: number, reason: DuelCloseReason) =>
    client.post<Duel>(`/portal/students/${studentId}/duels/${duelId}/close`, { reason }).then((r) => r.data),
};
