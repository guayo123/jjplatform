import client from './client';
import type { Student, StudentDiscipline, BeltPromotion, Payment, TechniqueCurriculum, PaymentOptions, UpcomingClass, Birthday, CompetitionResult, CompetitionResultForm } from '../types';

export const portalApi = {
  /** The logged-in student's profile(s) — one per academy they belong to. */
  me: () => client.get<Student[]>('/portal/me').then((r) => r.data),

  disciplines: (studentId: number) =>
    client.get<StudentDiscipline[]>(`/portal/students/${studentId}/disciplines`).then((r) => r.data),

  beltPromotions: (studentId: number) =>
    client.get<BeltPromotion[]>(`/portal/students/${studentId}/belt-promotions`).then((r) => r.data),

  /** Student adds a competition result (torneo) to one of their own disciplines. */
  addCompetitionResult: (studentId: number, studentDisciplineId: number, form: CompetitionResultForm) =>
    client.post<CompetitionResult>(`/portal/students/${studentId}/disciplines/${studentDisciplineId}/results`, form).then((r) => r.data),

  /** Student edits one of their own competition results. */
  updateCompetitionResult: (studentId: number, resultId: number, form: CompetitionResultForm) =>
    client.put<CompetitionResult>(`/portal/students/${studentId}/results/${resultId}`, form).then((r) => r.data),

  payments: (studentId: number) =>
    client.get<Payment[]>(`/portal/students/${studentId}/payments`).then((r) => r.data),

  paymentOptions: (studentId: number) =>
    client.get<PaymentOptions>(`/portal/students/${studentId}/payment-options`).then((r) => r.data),

  pay: (studentId: number, method: string, month: number, year: number) =>
    client.post<{ url: string }>(`/portal/students/${studentId}/pay`, { method, month, year }).then((r) => r.data),

  upcomingClasses: (studentId: number) =>
    client.get<UpcomingClass[]>(`/portal/students/${studentId}/classes`).then((r) => r.data),

  reserveClass: (studentId: number, scheduleId: number, date: string) =>
    client.post(`/portal/students/${studentId}/classes/${scheduleId}/reserve`, { date }),

  cancelClass: (studentId: number, scheduleId: number, date: string) =>
    client.delete(`/portal/students/${studentId}/classes/${scheduleId}/reserve`, { params: { date } }),

  birthdays: (studentId: number) =>
    client.get<Birthday[]>(`/portal/students/${studentId}/birthdays`).then((r) => r.data),

  techniques: (studentId: number) =>
    client.get<TechniqueCurriculum[]>(`/portal/students/${studentId}/techniques`).then((r) => r.data),

  setTechniqueLearned: (studentId: number, techniqueId: number, learned: boolean) =>
    client.put(`/portal/students/${studentId}/techniques/${techniqueId}`, { learned }),

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
