import client from './client';

/** Staff-only duel maintenance (manual stale-bout sweep for the current academy). */
export const duelsAdminApi = {
  /** Expire accepted bouts left unresolved past the stale window. Returns how many were expired. */
  expireStale: () =>
    client.post<{ expired: number }>('/duels/maintenance/expire-stale').then((r) => r.data),
};
