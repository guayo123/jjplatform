import client from './client';
import type { AcademyPublic, AcademySettings, Discipline, Plan, PlanForm, Schedule, ScheduleForm } from '../types';

export const academiesApi = {
  list: () =>
    client.get<AcademyPublic[]>('/public/academies').then((r) => r.data),

  get: (id: number) =>
    client.get<AcademyPublic>(`/public/academies/${id}`).then((r) => r.data),

  // Admin: own academy
  getSettings: () =>
    client.get<AcademySettings>('/academy').then((r) => r.data),

  updateSettings: (data: Partial<AcademySettings>) =>
    client.put<AcademySettings>('/academy', data).then((r) => r.data),

  // Admin: disciplines
  getDisciplines: () =>
    client.get<Discipline[]>('/academy/disciplines').then((r) => r.data),

  createDiscipline: (name: string) =>
    client.post<Discipline>('/academy/disciplines', { name }).then((r) => r.data),

  updateDiscipline: (id: number, name: string) =>
    client.put<Discipline>(`/academy/disciplines/${id}`, { name }).then((r) => r.data),

  toggleDiscipline: (id: number) =>
    client.put<Discipline>(`/academy/disciplines/${id}/toggle-active`).then((r) => r.data),

  // Admin: plans
  getPlans: () =>
    client.get<Plan[]>('/academy/plans').then((r) => r.data),

  createPlan: (data: PlanForm) =>
    client.post<Plan>('/academy/plans', data).then((r) => r.data),

  updatePlan: (id: number, data: Partial<PlanForm>) =>
    client.put<Plan>(`/academy/plans/${id}`, data).then((r) => r.data),

  togglePlan: (id: number) =>
    client.put<Plan>(`/academy/plans/${id}/toggle-active`).then((r) => r.data),

  // Admin: schedules
  getSchedules: () =>
    client.get<Schedule[]>('/academy/schedules').then((r) => r.data),

  createSchedule: (data: ScheduleForm) =>
    client.post<Schedule>('/academy/schedules', data).then((r) => r.data),

  updateSchedule: (id: number, data: Partial<ScheduleForm>) =>
    client.put<Schedule>(`/academy/schedules/${id}`, data).then((r) => r.data),

  deleteSchedule: (id: number) =>
    client.delete(`/academy/schedules/${id}`).then((r) => r.data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client
      .post<{ url: string }>('/files/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
