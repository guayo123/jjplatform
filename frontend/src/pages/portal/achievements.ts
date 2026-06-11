import type { TrainingSession, TrainingSummary } from '../../types';

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
    if (s.modality) modalities.add(s.modality);
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
