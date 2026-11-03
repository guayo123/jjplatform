import client from './client';
import type { Attendance, AttendanceDay, AttendanceHistory, CheckinInfo } from '../types';

/** Where the printed QR points. From the native app the origin is localhost, so use the public site. */
export function checkinUrl(code: string): string {
  const origin = /^https?:\/\/localhost(:\d+)?$/.test(window.location.origin) && !import.meta.env.DEV
    ? 'https://jjplatform.vercel.app'
    : window.location.origin;
  return `${origin}/asistencia/${code}`;
}

/** Staff side of QR attendance. */
export const attendanceApi = {
  code: () => client.get<{ code: string }>('/attendance/code').then((r) => r.data.code),

  regenerateCode: () => client.post<{ code: string }>('/attendance/code/regenerate').then((r) => r.data.code),

  day: (date: string) => client.get<AttendanceDay>('/attendance/day', { params: { date } }).then((r) => r.data),

  mark: (studentId: number, scheduleId: number | null, date: string) =>
    client.post<Attendance>('/attendance', { studentId, scheduleId, date }).then((r) => r.data),

  remove: (id: number) => client.delete(`/attendance/${id}`),

  history: (studentId: number) =>
    client.get<AttendanceHistory>(`/attendance/students/${studentId}`).then((r) => r.data),
};

/** Student side: what the scanned QR offers, marking present, and logging it in the journal. */
export const checkinApi = {
  info: (code: string) => client.get<CheckinInfo>(`/portal/checkin/${encodeURIComponent(code)}`).then((r) => r.data),

  checkin: (code: string, studentIds: number[], scheduleId: number | null) =>
    client.post<Attendance[]>(`/portal/checkin/${encodeURIComponent(code)}`, { studentIds, scheduleId }).then((r) => r.data),

  logToJournal: (attendanceIds: number[]) =>
    client.post<{ created: number }>('/portal/checkin/journal', { attendanceIds }).then((r) => r.data.created),
};
