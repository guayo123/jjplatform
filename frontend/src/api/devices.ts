import client from './client';

/** FCM device-token registration so the backend can push academy notifications to this device. */
export const devicesApi = {
  register: (studentId: number, token: string, platform: string) =>
    client.post<void>(`/portal/students/${studentId}/devices`, { token, platform }).then((r) => r.data),

  unregister: (studentId: number, token: string) =>
    client.delete<void>(`/portal/students/${studentId}/devices`, { params: { token } }).then((r) => r.data),

  /** Debug-only: report a small client event (push lifecycle, icon change) so it shows in Railway logs. */
  clientLog: (studentId: number, event: string, detail?: string) =>
    client.post<void>(`/portal/students/${studentId}/client-log`, { event, detail: detail ?? '' }).then((r) => r.data),
};
