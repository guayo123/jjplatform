import client from './client';
import type { Technique, TechniqueForm } from '../types';

/** Staff-only management of the per-belt technique curriculum. */
export const techniquesApi = {
  listByBelt: (beltId: number) =>
    client.get<Technique[]>(`/disciplines/belts/${beltId}/techniques`).then((r) => r.data),

  create: (beltId: number, data: TechniqueForm) =>
    client.post<Technique>(`/disciplines/belts/${beltId}/techniques`, data).then((r) => r.data),

  update: (techniqueId: number, data: TechniqueForm) =>
    client.put<Technique>(`/techniques/${techniqueId}`, data).then((r) => r.data),

  delete: (techniqueId: number) =>
    client.delete(`/techniques/${techniqueId}`),
};
