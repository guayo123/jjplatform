import client from './client';
import type { Classmate, LeaderboardEntry, TrainingSession, TrainingSessionForm, TrainingSummary } from '../types';

/** Device-local YYYY-MM-DD; sent so streak day boundaries follow the student, not the server TZ. */
const localToday = () => new Date().toLocaleDateString('en-CA');

export const trainingApi = {
  list: (studentId: number) =>
    client.get<TrainingSession[]>(`/portal/students/${studentId}/training`).then((r) => r.data),

  classmates: (studentId: number) =>
    client.get<Classmate[]>(`/portal/students/${studentId}/classmates`).then((r) => r.data),

  summary: (studentId: number) =>
    client
      .get<TrainingSummary>(`/portal/students/${studentId}/training/summary`, { params: { today: localToday() } })
      .then((r) => r.data),

  /** Academy leaderboard: active classmates ranked by sessions this week, streak as tiebreaker. */
  leaderboard: (studentId: number) =>
    client
      .get<LeaderboardEntry[]>(`/portal/students/${studentId}/training/leaderboard`, { params: { today: localToday() } })
      .then((r) => r.data),

  /** Spends a monthly streak repair to fill the current 1-day gap; returns the refreshed summary. */
  repairStreak: (studentId: number) =>
    client
      .post<TrainingSummary>(`/portal/students/${studentId}/training/streak-repair`, null, {
        params: { today: localToday() },
      })
      .then((r) => r.data),

  create: (studentId: number, data: TrainingSessionForm) =>
    client.post<TrainingSession>(`/portal/students/${studentId}/training`, data).then((r) => r.data),

  /** Kickboxing session — striking TrainingSession; the backend resolves the academy's discipline. */
  createKickboxing: (studentId: number, data: TrainingSessionForm) =>
    client.post<TrainingSession>(`/portal/students/${studentId}/kickboxing`, data).then((r) => r.data),

  remove: (studentId: number, sessionId: number) =>
    client.delete<void>(`/portal/students/${studentId}/training/${sessionId}`).then((r) => r.data),

  getGoal: () =>
    client.get<{ goal: number | null }>('/portal/training/goal').then((r) => r.data.goal),

  setGoal: (goal: number | null) =>
    client.put<{ goal: number | null }>('/portal/training/goal', { goal }).then((r) => r.data.goal),
};
