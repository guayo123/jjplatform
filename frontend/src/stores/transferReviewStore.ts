import { create } from 'zustand';
import { paymentsApi } from '../api/payments';

interface TransferReviewState {
  /** Transfer receipts waiting for staff review (all months); shown as a badge on "Pagos". */
  count: number;
  setCount: (count: number) => void;
  refresh: () => Promise<void>;
}

export const useTransferReviewStore = create<TransferReviewState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  refresh: async () => {
    try {
      const reviews = await paymentsApi.pendingTransfers();
      set({ count: reviews.length });
    } catch {
      // A badge is not worth an error: keep the last known count.
    }
  },
}));
