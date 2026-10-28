import client from './client';
import type { Student, StudentDiscipline, BeltPromotion, Payment, TechniqueCurriculum, PaymentOptions, UpcomingClass, Birthday, CompetitionResult, CompetitionResultForm, StudentCard } from '../types';

/** One profile's fee in the "pay all" card; planTotal/discountReason only when a standing discount applies. */
export interface FamilyDueRow { studentId: number; name: string; amount: number; planTotal?: number; discountReason?: string | null }

export const portalApi = {
  /** The logged-in student's profile(s) — one per academy they belong to. */
  me: () => client.get<Student[]>('/portal/me').then((r) => r.data),

  disciplines: (studentId: number) =>
    client.get<StudentDiscipline[]>(`/portal/students/${studentId}/disciplines`).then((r) => r.data),

  /** Card of an academy mate (tapped from a ranking): name, rut, belt, age, photo. */
  studentCard: (studentId: number, targetId: number) =>
    client.get<StudentCard>(`/portal/students/${studentId}/students/${targetId}/card`).then((r) => r.data),

  /** The student updates their own weight (kg); null clears it. */
  setWeight: (studentId: number, weight: number | null) =>
    client.put<{ weight: number | null }>(`/portal/students/${studentId}/weight`, { weight }).then((r) => r.data.weight),

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

  pay: (studentId: number, method: string, month: number, year: number, app = false) =>
    client.post<{ url: string }>(`/portal/students/${studentId}/pay`, { method, month, year, app }).then((r) => r.data),

  /** The month's unpaid fees of every profile this login can pay in the same academy. */
  familyDue: (studentId: number, month: number, year: number) =>
    client.get<FamilyDueRow[]>(
      `/portal/students/${studentId}/family-due`, { params: { month, year } }).then((r) => r.data),

  /** One checkout paying the month of several profiles at once. */
  payAll: (studentId: number, studentIds: number[], method: string, month: number, year: number, app = false) =>
    client.post<{ url: string }>(`/portal/students/${studentId}/pay-all`, { method, month, year, app, studentIds }).then((r) => r.data),

  /** Uploads a bank-transfer receipt for the month (of several profiles when studentIds is given). */
  submitTransfer: (studentId: number, file: Blob, month: number, year: number, studentIds?: number[],
                   onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file, 'comprobante.jpg');
    formData.append('month', String(month));
    formData.append('year', String(year));
    if (studentIds?.length) formData.append('studentIds', studentIds.join(','));
    return client.post(`/portal/students/${studentId}/transfer`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },

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
