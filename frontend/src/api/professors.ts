import client from './client';
import type { Professor, ProfessorForm } from '../types';

export const professorsApi = {
  list: () =>
    client.get<Professor[]>('/professors').then((r) => r.data),

  get: (id: number) =>
    client.get<Professor>(`/professors/${id}`).then((r) => r.data),

  create: (data: ProfessorForm) =>
    client.post<Professor>('/professors', data).then((r) => r.data),

  update: (id: number, data: ProfessorForm & { active?: boolean }) =>
    client.put<Professor>(`/professors/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/professors/${id}`),
};
