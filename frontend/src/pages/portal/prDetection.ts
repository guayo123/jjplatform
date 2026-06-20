import type { ConditioningExercise, ConditioningSession } from '../../types';

export interface PR {
  exerciseName: string;
  reps: number;
  weightKg: number;
  prevBest: number;
}

/**
 * Detects new personal records in a just-saved conditioning session.
 *
 * A PR is when a set has more weight than the historical best at the same rep count.
 * Only fires when the exercise has prior history — first-ever sets just establish the baseline.
 *
 * @param newExercises  Exercises from the session that was just saved.
 * @param history       All conditioning sessions BEFORE this one (not including the new one).
 */
export function detectPRs(newExercises: ConditioningExercise[], history: ConditioningSession[]): PR[] {
  // Build index: exerciseName (lowercase) → repCount → maxWeight
  const histIndex = new Map<string, Map<number, number>>();
  for (const session of history) {
    for (const ex of session.exercises) {
      const key = ex.name.trim().toLowerCase();
      if (!histIndex.has(key)) histIndex.set(key, new Map());
      const byReps = histIndex.get(key)!;
      for (const s of ex.sets) {
        if (s.reps == null || s.weightKg == null || s.weightKg <= 0) continue;
        const prev = byReps.get(s.reps) ?? 0;
        if (s.weightKg > prev) byReps.set(s.reps, s.weightKg);
      }
    }
  }

  const prs: PR[] = [];
  // Track best within the new session itself (avoid duplicating for same exercise/reps)
  const newBest = new Map<string, Map<number, number>>();

  for (const ex of newExercises) {
    const key = ex.name.trim().toLowerCase();
    if (!key) continue;
    const byReps = histIndex.get(key); // undefined = first time ever → skip

    if (!newBest.has(key)) newBest.set(key, new Map());
    const sessionBest = newBest.get(key)!;

    for (const s of ex.sets) {
      if (s.reps == null || s.weightKg == null || s.weightKg <= 0) continue;

      // Track best within this session for this exercise+reps
      const prevInSession = sessionBest.get(s.reps) ?? 0;
      if (s.weightKg <= prevInSession) continue;
      sessionBest.set(s.reps, s.weightKg);

      // No historical data for this exercise → just a baseline, not a PR yet
      if (!byReps) continue;

      const historicalBest = byReps.get(s.reps);
      // No history at this rep count → also not a PR (can't compare)
      if (historicalBest == null) continue;

      if (s.weightKg > historicalBest) {
        prs.push({
          exerciseName: ex.name.trim(),
          reps: s.reps,
          weightKg: s.weightKg,
          prevBest: historicalBest,
        });
      }
    }
  }

  return prs;
}
