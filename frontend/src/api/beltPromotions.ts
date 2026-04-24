import client from './client';
import type { BeltPromotion, BeltPromotionForm } from '../types';

export const beltPromotionsApi = {
  getByStudent: (studentId: number) =>
    client.get<BeltPromotion[]>('/belt-promotions', { params: { studentId } }).then((r) => r.data),

  create: (data: BeltPromotionForm) =>
    client.post<BeltPromotion>('/belt-promotions', data).then((r) => r.data),

  delete: (id: number) =>
    client.delete(`/belt-promotions/${id}`),
};
