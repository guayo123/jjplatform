import client from './client';
import type { Classmate, TrainingSession, TrainingSessionForm, TrainingSummary } from '../types';

export const trainingApi = {
  list: (studentId: number) =>
    client.get<TrainingSession[]>(`/portal/students/${studentId}/training`).then((r) => r.data),

  classmates: (studentId: number) =>
    client.get<Classmate[]>(`/portal/students/${studentId}/classmates`).then((r) => r.data),

  summary: (studentId: number) =>
    client.get<TrainingSummary>(`/portal/students/${studentId}/training/summary`).then((r) => r.data),

  create: (studentId: number, data: TrainingSessionForm) =>
    client.post<TrainingSession>(`/portal/students/${studentId}/training`, data).then((r) => r.data),

  remove: (studentId: number, sessionId: number) =>
    client.delete<void>(`/portal/students/${studentId}/training/${sessionId}`).then((r) => r.data),

  getGoal: () =>
    client.get<{ goal: number | null }>('/portal/training/goal').then((r) => r.data.goal),

  setGoal: (goal: number | null) =>
    client.put<{ goal: number | null }>('/portal/training/goal', { goal }).then((r) => r.data.goal),
};
