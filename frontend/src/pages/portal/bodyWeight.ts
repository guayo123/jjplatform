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
 * sync them to the server and only clear localStorage after all saves succeed.
 * If any save fails (e.g. backend not yet deployed), the data stays in localStorage
 * and the migration will be retried on the next page load.
 */
export async function migrateLegacyWeights(studentId: number): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  let entries: WeightEntry[];
  try {
    entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) { localStorage.removeItem(LEGACY_KEY); return; }
  } catch {
    localStorage.removeItem(LEGACY_KEY);
    return;
  }
  const results = await Promise.all(
    entries.map((e) => weightApi.save(studentId, e.date, e.weightKg).then(() => true).catch(() => false))
  );
  // Only clear localStorage if every entry was saved successfully
  if (results.every(Boolean)) {
    localStorage.removeItem(LEGACY_KEY);
  }
}
