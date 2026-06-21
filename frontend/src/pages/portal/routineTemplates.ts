const KEY = 'jjp_routine_templates';

export interface TemplateSet {
  reps: string;
  weight: string;
}

export interface TemplateExercise {
  name: string;
  restSec: number | null;
  sets: TemplateSet[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  focus: string | null;
  durationMin: number | null;
  exercises: TemplateExercise[];
  savedAt: string;
}

export function loadTemplates(): RoutineTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RoutineTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(data: Omit<RoutineTemplate, 'id' | 'savedAt'>): RoutineTemplate {
  const all = loadTemplates();
  const t: RoutineTemplate = { ...data, id: `${Date.now()}`, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify([...all, t]));
  return t;
}

export function deleteTemplate(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadTemplates().filter((t) => t.id !== id)));
}
