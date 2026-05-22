import client from './client';
import type { StudentDiscipline, StudentDisciplineForm, CompetitionResult, CompetitionResultForm } from '../types';

export const studentDisciplinesApi = {
  list: (studentId: number) =>
    client.get<StudentDiscipline[]>(`/students/${studentId}/disciplines`).then(r => r.data),

  add: (studentId: number, data: StudentDisciplineForm) =>
    client.post<StudentDiscipline>(`/students/${studentId}/disciplines`, data).then(r => r.data),

  update: (id: number, data: Partial<StudentDisciplineForm & { active: boolean }>) =>
    client.put<StudentDiscipline>(`/students/disciplines/${id}`, data).then(r => r.data),

  updateBelt: (id: number, belt: string | null, stripes: number) =>
    client.put<StudentDiscipline>(`/students/disciplines/${id}/belt`, { belt, stripes }).then(r => r.data),

  remove: (id: number) =>
    client.delete(`/students/disciplines/${id}`),

  addResult: (studentDisciplineId: number, data: CompetitionResultForm) =>
    client.post<CompetitionResult>(`/students/disciplines/${studentDisciplineId}/results`, data).then(r => r.data),

  updateResult: (resultId: number, data: Partial<CompetitionResultForm>) =>
    client.put<CompetitionResult>(`/students/disciplines/results/${resultId}`, data).then(r => r.data),

  deleteResult: (resultId: number) =>
    client.delete(`/students/disciplines/results/${resultId}`),
};
