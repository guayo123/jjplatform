import client from './client';
import type { Student, StudentDiscipline, BeltPromotion, Payment } from '../types';

export const portalApi = {
  /** The logged-in student's profile(s) — one per academy they belong to. */
  me: () => client.get<Student[]>('/portal/me').then((r) => r.data),

  disciplines: (studentId: number) =>
    client.get<StudentDiscipline[]>(`/portal/students/${studentId}/disciplines`).then((r) => r.data),

  beltPromotions: (studentId: number) =>
    client.get<BeltPromotion[]>(`/portal/students/${studentId}/belt-promotions`).then((r) => r.data),

  payments: (studentId: number) =>
    client.get<Payment[]>(`/portal/students/${studentId}/payments`).then((r) => r.data),

  getBanner: () =>
    client.get<{ banner: string | null }>('/portal/banner').then((r) => r.data.banner),

  setBanner: (banner: string | null) =>
    client.put<{ banner: string | null }>('/portal/banner', { banner }).then((r) => r.data.banner),

  uploadPhoto: (studentId: number, file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return client
      .post<{ url: string }>(`/portal/students/${studentId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data);
  },
};
