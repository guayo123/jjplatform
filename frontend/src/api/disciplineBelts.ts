import client from './client';
import type { DisciplineAgeCategory } from '../types';

export const disciplineBeltsApi = {
  getCategories: (disciplineId: number) =>
    client.get<DisciplineAgeCategory[]>(`/disciplines/${disciplineId}/categories`).then(r => r.data),

  createCategory: (disciplineId: number, data: { name: string; minAge: number | null; maxAge: number | null }) =>
    client.post<DisciplineAgeCategory>(`/disciplines/${disciplineId}/categories`, data).then(r => r.data),

  updateCategory: (catId: number, data: { name: string; minAge: number | null; maxAge: number | null }) =>
    client.put<DisciplineAgeCategory>(`/disciplines/categories/${catId}`, data).then(r => r.data),

  deleteCategory: (catId: number) =>
    client.delete(`/disciplines/categories/${catId}`),

  addBelt: (catId: number, data: { name: string; colorHex: string }) =>
    client.post<DisciplineAgeCategory>(`/disciplines/categories/${catId}/belts`, data).then(r => r.data),

  updateBelt: (beltId: number, data: { name: string; colorHex: string }) =>
    client.put<DisciplineAgeCategory>(`/disciplines/belts/${beltId}`, data).then(r => r.data),

  deleteBelt: (beltId: number) =>
    client.delete(`/disciplines/belts/${beltId}`),

  reorderBelts: (catId: number, orderedIds: number[]) =>
    client.put<DisciplineAgeCategory>(`/disciplines/categories/${catId}/belts/reorder`, orderedIds).then(r => r.data),
};
