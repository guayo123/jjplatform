import client from './client';
import type { Student, StudentForm } from '../types';

export const studentsApi = {
  list: () =>
    client.get<Student[]>('/students').then((r) => r.data),

  get: (id: number) =>
    client.get<Student>(`/students/${id}`).then((r) => r.data),

  create: (data: StudentForm) =>
    client.post<Student>('/students', data).then((r) => r.data),

  update: (id: number, data: StudentForm) =>
    client.put<Student>(`/students/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/students/${id}`),

  /** Grant (months>0, extends from today/current expiry) or revoke (months<=0) the student's Pro. */
  /** Name/email of a guardian already known in the academy by RUT (null if not found). */
  guardianLookup: (rut: string) =>
    client
      .get<{ name: string; email: string; source: 'STUDENT' | 'GUARDIAN' } | ''>('/students/guardian-lookup', { params: { rut } })
      .then((r) => (r.status === 204 || !r.data ? null : r.data)),

  setPremium: (id: number, months: number) =>
    client.put<Student>(`/students/${id}/premium`, { months }).then((r) => r.data),
};
