import client from './client';
import type { AtRiskStudent } from '../types';

/** Staff churn-risk dashboard + manual WhatsApp reminders. */
export const retentionApi = {
  atRisk: () =>
    client.get<AtRiskStudent[]>('/retention/at-risk').then((r) => r.data),

  remind: (studentId: number) =>
    client.post(`/retention/students/${studentId}/remind`),
};
