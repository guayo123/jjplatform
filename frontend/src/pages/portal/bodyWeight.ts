const KEY = 'jjp_body_weight';

export interface WeightEntry {
  date: string;   // YYYY-MM-DD local
  weightKg: number;
}

export function loadWeightEntries(): WeightEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch {
    return [];
  }
}

export function logWeight(date: string, weightKg: number): void {
  const entries = loadWeightEntries().filter((e) => e.date !== date);
  entries.push({ date, weightKg });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function deleteWeightEntry(date: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadWeightEntries().filter((e) => e.date !== date)));
}

export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
