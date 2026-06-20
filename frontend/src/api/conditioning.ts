import client from './client';
import type { ConditioningSession, ConditioningSessionForm } from '../types';

/** Strength & conditioning journal (gym / physical prep) — parallel to the BJJ training journal. */
export const conditioningApi = {
  list: (studentId: number) =>
    client.get<ConditioningSession[]>(`/portal/students/${studentId}/conditioning`).then((r) => r.data),

  create: (studentId: number, data: ConditioningSessionForm) =>
    client.post<ConditioningSession>(`/portal/students/${studentId}/conditioning`, data).then((r) => r.data),

  remove: (studentId: number, sessionId: number) =>
    client.delete<void>(`/portal/students/${studentId}/conditioning/${sessionId}`).then((r) => r.data),
};
