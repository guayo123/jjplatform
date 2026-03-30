import client from './client';
import type { AcademySummary, RegisterRequest } from '../types';

export const superApi = {
  listAcademies: () =>
    client.get<AcademySummary[]>('/super/academies').then((res) => res.data),

  createAcademy: (data: RegisterRequest) =>
    client.post<AcademySummary>('/super/academies', data).then((res) => res.data),

  toggleAcademyActive: (id: number) =>
    client.patch<AcademySummary>(`/super/academies/${id}/toggle-active`).then((res) => res.data),
};
