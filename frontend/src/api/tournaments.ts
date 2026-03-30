import client from './client';
import type { Tournament } from '../types';

export const tournamentsApi = {
  list: () =>
    client.get<Tournament[]>('/tournaments').then((r) => r.data),

  get: (id: number) =>
    client.get<Tournament>(`/tournaments/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string; date: string; maxParticipants?: number }) =>
    client.post<Tournament>('/tournaments', data).then((r) => r.data),

  addParticipant: (tournamentId: number, studentId: number) =>
    client.post<Tournament>(`/tournaments/${tournamentId}/participants`, { studentId }).then((r) => r.data),

  generateBracket: (tournamentId: number) =>
    client.post<Tournament>(`/tournaments/${tournamentId}/generate-bracket`).then((r) => r.data),

  recordResult: (tournamentId: number, matchId: number, winnerId: number) =>
    client.put<Tournament>(`/tournaments/${tournamentId}/matches/${matchId}`, { winnerId }).then((r) => r.data),
};
