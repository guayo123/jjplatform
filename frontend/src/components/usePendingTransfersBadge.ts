import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTransferReviewStore } from '../stores/transferReviewStore';

const STAFF = ['ADMIN', 'ENCARGADO', 'PROFESOR'];

/**
 * Number of transfer receipts waiting for review, for the "Pagos" badge in the admin nav. Refreshes on
 * every page change and every 2 minutes; 0 for roles that can't review.
 */
export function usePendingTransfersBadge(): number {
  const role = useAuthStore((s) => s.role);
  const { count, refresh } = useTransferReviewStore();
  const { pathname } = useLocation();
  const staff = !!role && STAFF.includes(role);

  useEffect(() => {
    if (!staff) return;
    refresh();
    const id = window.setInterval(refresh, 120_000);
    return () => window.clearInterval(id);
  }, [staff, pathname, refresh]);

  return staff ? count : 0;
}
