import client from './client';
import type { AcademyPublic } from '../types';

export const academiesApi = {
  list: () =>
    client.get<AcademyPublic[]>('/public/academies').then((r) => r.data),

  get: (id: number) =>
    client.get<AcademyPublic>(`/public/academies/${id}`).then((r) => r.data),
};
