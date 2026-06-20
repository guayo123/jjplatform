import type { ConditioningSession, TrainingSession, TrainingSummary } from '../../types';

/**
 * Achievements are derived client-side from the student's own journal (sessions +
 * summary) — no backend state. Unlocks are detected by diffing against the set of
 * already-celebrated ids kept in localStorage, so each badge celebrates exactly once.
 */
export interface Achievement {
  id: string;
  emoji: string;
  /** Short badge name shown in the vitrina and as the celebration headline. */
  title: string;
  /** Requirement line for the vitrina, e.g. "Registra 10 entrenos". */
  description: string;
  /** Unit label for the celebration count-up, e.g. "entrenos registrados". */
  unit: string;
  target: number;
  current: number;
  unlocked: boolean;
}

export function computeAchievements(sessions: TrainingSession[], summary: TrainingSummary | null): Achievement[] {
  let minutes = 0;
  let rounds = 0;
  let submissions = 0;
  const modalities = new Set<string>();
  const partners = new Set<string>();
  for (const s of sessions) {
    minutes += s.durationMin ?? 0;
    rounds += s.roundsCount ?? 0;
    submissions += s.submissions.filter((sub) => sub.direction === 'LOGRADA').length;
    // Only the two real modalities count for the Gi+No-Gi badge (not open mat / competition).
    if (s.modality === 'GI' || s.modality === 'NOGI') modalities.add(s.modality);
    for (const p of s.partners) partners.add(p.name.trim().toLowerCase());
  }
  const totalSessions = sessions.length;
  const hours = Math.floor(minutes / 60);
  const maxStreak = summary?.maxStreak ?? 0;

  const defs: Array<Omit<Achievement, 'current' | 'unlocked'> & { value: number }> = [
    { id: 'first-session', emoji: '🥋', title: 'Primer paso', description: 'Registra tu primer entreno', unit: 'entreno registrado', target: 1, value: totalSessions },
    { id: 'sessions-10', emoji: '📈', title: 'Constancia', description: 'Registra 10 entrenos', unit: 'entrenos registrados', target: 10, value: totalSessions },
    { id: 'sessions-50', emoji: '🏅', title: 'Veterano', description: 'Registra 50 entrenos', unit: 'entrenos registrados', target: 50, value: totalSessions },
    { id: 'sessions-100', emoji: '💯', title: 'Centurión', description: 'Registra 100 entrenos', unit: 'entrenos registrados', target: 100, value: totalSessions },
    { id: 'streak-3', emoji: '🔥', title: 'En llamas', description: 'Racha de 3 días seguidos', unit: 'días seguidos', target: 3, value: maxStreak },
    { id: 'streak-7', emoji: '🗓️', title: 'Semana de hierro', description: 'Racha de 7 días seguidos', unit: 'días seguidos', target: 7, value: maxStreak },
    { id: 'streak-30', emoji: '🏆', title: 'Imparable', description: 'Racha de 30 días seguidos', unit: 'días seguidos', target: 30, value: maxStreak },
    { id: 'hours-10', emoji: '⏱️', title: 'Horas de tatami', description: 'Acumula 10 horas entrenadas', unit: 'horas en el tatami', target: 10, value: hours },
    { id: 'hours-50', emoji: '⚡', title: 'Incansable', description: 'Acumula 50 horas entrenadas', unit: 'horas en el tatami', target: 50, value: hours },
    { id: 'rounds-100', emoji: '🥊', title: 'Guerrero', description: 'Suma 100 rounds de sparring', unit: 'rounds de sparring', target: 100, value: rounds },
    { id: 'subs-25', emoji: '🎯', title: 'Finalizador', description: 'Logra 25 sumisiones', unit: 'sumisiones logradas', target: 25, value: submissions },
    { id: 'gi-nogi', emoji: '🔄', title: 'Dos caras', description: 'Entrena en Gi y en No-Gi', unit: 'modalidades dominadas', target: 2, value: modalities.size },
    { id: 'partners-5', emoji: '🤝', title: 'Sociable', description: 'Entrena con 5 compañeros distintos', unit: 'compañeros distintos', target: 5, value: partners.size },
  ];

  return defs.map(({ value, ...d }) => ({
    ...d,
    current: Math.min(value, d.target),
    unlocked: value >= d.target,
  }));
}

/** Physical-prep achievements, derived from the conditioning (gym) journal. */
export function computeConditioningAchievements(sessions: ConditioningSession[]): Achievement[] {
  let sets = 0;
  let reps = 0;
  let volume = 0; // total kg moved = Σ(reps × weight)
  const focuses = new Set<string>();
  for (const s of sessions) {
    if (s.focus) focuses.add(s.focus);
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        sets += 1;
        reps += set.reps ?? 0;
        if (set.reps != null && set.weightKg != null) volume += set.reps * set.weightKg;
      }
    }
  }
  const total = sessions.length;

  const defs: Array<Omit<Achievement, 'current' | 'unlocked'> & { value: number }> = [
    { id: 'c-first', emoji: '💪', title: 'A darle', description: 'Registra tu primer entreno físico', unit: 'entreno físico', target: 1, value: total },
    { id: 'c-10', emoji: '🏋️', title: 'Gimnasio', description: 'Registra 10 entrenos físicos', unit: 'entrenos físicos', target: 10, value: total },
    { id: 'c-30', emoji: '🦾', title: 'Disciplina de hierro', description: 'Registra 30 entrenos físicos', unit: 'entrenos físicos', target: 30, value: total },
    { id: 'c-sets-100', emoji: '🔁', title: 'Volumen', description: 'Acumula 100 series', unit: 'series', target: 100, value: sets },
    { id: 'c-reps-1000', emoji: '🔢', title: 'Mil reps', description: 'Acumula 1.000 repeticiones', unit: 'repeticiones', target: 1000, value: reps },
    { id: 'c-vol-50t', emoji: '⚖️', title: '50 toneladas', description: 'Mueve 50.000 kg en total (peso × reps, sumando todas tus sesiones)', unit: 'kg movidos', target: 50000, value: Math.round(volume) },
    { id: 'c-vol-250t', emoji: '🏗️', title: '250 toneladas', description: 'Mueve 250.000 kg en total', unit: 'kg movidos', target: 250000, value: Math.round(volume) },
    { id: 'c-focus-all', emoji: '🎯', title: 'Cuerpo completo', description: 'Entrena los 8 grupos musculares', unit: 'grupos trabajados', target: 8, value: focuses.size },
  ];

  return defs.map(({ value, ...d }) => ({
    ...d,
    current: Math.min(value, d.target),
    unlocked: value >= d.target,
  }));
}

const SEEN_KEY = 'jjp_seen_achievements';

function readSeen(): Set<string> | null {
  const raw = localStorage.getItem(SEEN_KEY);
  if (raw == null) return null;
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

/**
 * Unlocked achievements that haven't been celebrated yet, marking them seen.
 * First call on a device seeds the seen-set silently (a student with history
 * shouldn't get a barrage of celebrations for old milestones).
 */
export function takeNewlyUnlocked(achievements: Achievement[]): Achievement[] {
  const unlocked = achievements.filter((a) => a.unlocked);
  const seen = readSeen();
  if (seen == null) {
    writeSeen(new Set(unlocked.map((a) => a.id)));
    return [];
  }
  const fresh = unlocked.filter((a) => !seen.has(a.id));
  if (fresh.length > 0) {
    for (const a of fresh) seen.add(a.id);
    writeSeen(seen);
  }
  return fresh;
}
