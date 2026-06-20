import client from './client';

/** Admin broadcast: send a push to the academy's students (or all academies for super admin). */
export const notificationsApi = {
  broadcast: (title: string, body: string, scope: 'ACADEMY' | 'ALL') =>
    client
      .post<{ sent: number }>('/admin/notifications/broadcast', { title, body, scope })
      .then((r) => r.data),
};
