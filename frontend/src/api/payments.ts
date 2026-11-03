import client from './client';
import type { FamilyDue, Payment, PaymentForm, TransferReview } from '../types';

export const paymentsApi = {
  getByMonth: (month: number, year: number) =>
    client.get<Payment[]>('/payments', { params: { month, year } }).then((r) => r.data),

  getByYear: (year: number) =>
    client.get<Payment[]>('/payments/yearly', { params: { year } }).then((r) => r.data),

  getByStudent: (studentId: number) =>
    client.get<Payment[]>(`/payments/student/${studentId}`).then((r) => r.data),

  create: (data: PaymentForm) =>
    client.post<Payment>('/payments', data).then((r) => r.data),

  /** The student's family (guardian + records in their charge) and what each owes for the month. */
  family: (studentId: number, month: number, year: number) =>
    client.get<FamilyDue>(`/payments/family/${studentId}`, { params: { month, year } }).then((r) => r.data),

  /** Records the month's full balance of the given family members in one go. */
  payFamily: (studentId: number, studentIds: number[], month: number, year: number, notes?: string) =>
    client.post<Payment[]>(`/payments/family/${studentId}`, { studentIds, month, year, notes }).then((r) => r.data),

  abono: (id: number, abono: number) =>
    client.put<Payment>(`/payments/${id}/abono`, { abono }).then((r) => r.data),

  /** Transfer receipts sent from the portal, waiting for review. */
  pendingTransfers: () =>
    client.get<TransferReview[]>('/payments/transfers/pending').then((r) => r.data),

  /** Marks every month of the receipt paid; `amount` (single month only) records less money received. */
  approveTransfer: (paymentId: number, amount?: number) =>
    client.post(`/payments/${paymentId}/transfer/approve`, amount != null ? { amount } : {}),

  rejectTransfer: (paymentId: number, reason: string) =>
    client.post(`/payments/${paymentId}/transfer/reject`, { reason }),

  delete: (id: number) =>
    client.delete(`/payments/${id}`),
};
