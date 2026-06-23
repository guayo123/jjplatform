import client from '../../api/client';

const LEGACY_KEY = 'jjp_body_weight';

export interface WeightEntry {
  date: string;   // YYYY-MM-DD local
  weightKg: number;
}

export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const weightApi = {
  list: (studentId: number) =>
    client.get<WeightEntry[]>(`/portal/students/${studentId}/weight-entries`).then((r) => r.data),

  save: (studentId: number, date: string, weightKg: number) =>
    client.post<WeightEntry>(`/portal/students/${studentId}/weight-entries`, { date, weightKg }).then((r) => r.data),

  remove: (studentId: number, date: string) =>
    client.delete<void>(`/portal/students/${studentId}/weight-entries/${date}`).then((r) => r.data),
};

/**
 * One-time migration: if localStorage has entries from the old implementation,
 * sync them to the server and clear local storage so they aren't lost.
 */
export async function migrateLegacyWeights(studentId: number): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const entries: WeightEntry[] = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) { localStorage.removeItem(LEGACY_KEY); return; }
    await Promise.all(entries.map((e) => weightApi.save(studentId, e.date, e.weightKg).catch(() => {})));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    localStorage.removeItem(LEGACY_KEY);
  }
}
