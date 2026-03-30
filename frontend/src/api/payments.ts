import client from './client';
import type { Payment, PaymentForm } from '../types';

export const paymentsApi = {
  getByMonth: (month: number, year: number) =>
    client.get<Payment[]>('/payments', { params: { month, year } }).then((r) => r.data),

  getByYear: (year: number) =>
    client.get<Payment[]>('/payments/yearly', { params: { year } }).then((r) => r.data),

  getByStudent: (studentId: number) =>
    client.get<Payment[]>(`/payments/student/${studentId}`).then((r) => r.data),

  create: (data: PaymentForm) =>
    client.post<Payment>('/payments', data).then((r) => r.data),
};
