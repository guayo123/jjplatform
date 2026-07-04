import client from './client';
import type { CoachInsight, Classmate, Leaderboards, ProInsights, TrainingSession, TrainingSessionForm, TrainingSummary } from '../types';

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

  /** Academy leaderboards (🥋 arte marcial + 🏋️ físico) ranked by days this week, streak as tiebreaker. */
  leaderboard: (studentId: number) =>
    client
      .get<Leaderboards>(`/portal/students/${studentId}/training/leaderboard`, { params: { today: localToday() } })
      .then((r) => r.data),

  /** Premium "you vs academy" snapshot (requires active Pro). */
  proInsights: (studentId: number) =>
    client
      .get<ProInsights>(`/portal/students/${studentId}/training/insights-pro`, { params: { today: localToday() } })
      .then((r) => r.data),

  /** Premium AI insight: last generated analysis (cached; no AI call). */
  coach: (studentId: number) =>
    client.get<CoachInsight>(`/portal/students/${studentId}/training/coach`).then((r) => r.data),

  /** Premium AI insight: generate (or return today's cached) analysis. At most one AI call per day. */
  generateCoach: (studentId: number) =>
    client
      .post<CoachInsight>(`/portal/students/${studentId}/training/coach`, null, { params: { today: localToday() } })
      .then((r) => r.data),

  create: (studentId: number, data: TrainingSessionForm) =>
    client.post<TrainingSession>(`/portal/students/${studentId}/training`, data).then((r) => r.data),

  /** Kickboxing session — striking TrainingSession; the backend resolves the academy's discipline. */
  createKickboxing: (studentId: number, data: TrainingSessionForm) =>
    client.post<TrainingSession>(`/portal/students/${studentId}/kickboxing`, data).then((r) => r.data),

  remove: (studentId: number, sessionId: number) =>
    client.delete<void>(`/portal/students/${studentId}/training/${sessionId}`).then((r) => r.data),

  /** Both weekly goals: {martial, conditioning} (null = not set). */
  getGoals: () =>
    client.get<{ martial: number | null; conditioning: number | null }>('/portal/training/goals').then((r) => r.data),

  /** Sets one weekly goal (type = 'martial' | 'conditioning'); returns both. Sends today so the server can
   *  enforce the "only on Monday" rule for an already-set goal. */
  setGoal: (type: 'martial' | 'conditioning', goal: number | null) =>
    client
      .put<{ martial: number | null; conditioning: number | null }>('/portal/training/goals', { type, goal, today: localToday() })
      .then((r) => r.data),
};
