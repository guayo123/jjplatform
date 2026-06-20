import type { ConditioningFocus } from '../../types';

export type MuscleRegion = 'chest' | 'abs' | 'shoulders' | 'arms' | 'legs' | 'back';

export const EXERCISE_CATALOG: Array<{ name: string; focus: ConditioningFocus; muscles: MuscleRegion[] }> = [
  // Pecho
  { name: 'Press de banca con barra',        focus: 'PECHO',    muscles: ['chest', 'shoulders', 'arms'] },
  { name: 'Press inclinado con barra',        focus: 'PECHO',    muscles: ['chest', 'shoulders', 'arms'] },
  { name: 'Press con mancuernas',             focus: 'PECHO',    muscles: ['chest', 'shoulders', 'arms'] },
  { name: 'Press inclinado con mancuernas',   focus: 'PECHO',    muscles: ['chest', 'shoulders', 'arms'] },
  { name: 'Aperturas con mancuernas',         focus: 'PECHO',    muscles: ['chest'] },
  { name: 'Fondos en paralelas',              focus: 'PECHO',    muscles: ['chest', 'arms', 'shoulders'] },
  { name: 'Pec deck (contractor)',            focus: 'PECHO',    muscles: ['chest'] },
  { name: 'Cruces en polea',                  focus: 'PECHO',    muscles: ['chest'] },
  // Espalda
  { name: 'Dominadas',                        focus: 'ESPALDA',  muscles: ['back', 'arms'] },
  { name: 'Jalón al pecho',                   focus: 'ESPALDA',  muscles: ['back', 'arms'] },
  { name: 'Remo con barra',                   focus: 'ESPALDA',  muscles: ['back', 'arms'] },
  { name: 'Remo con mancuerna',               focus: 'ESPALDA',  muscles: ['back', 'arms'] },
  { name: 'Remo en polea baja',               focus: 'ESPALDA',  muscles: ['back', 'arms'] },
  { name: 'Peso muerto',                      focus: 'ESPALDA',  muscles: ['back', 'legs'] },
  { name: 'Pull-over',                        focus: 'ESPALDA',  muscles: ['back', 'chest'] },
  { name: 'Face pull',                        focus: 'ESPALDA',  muscles: ['shoulders', 'back'] },
  // Hombro
  { name: 'Press militar con barra',          focus: 'HOMBRO',   muscles: ['shoulders', 'arms'] },
  { name: 'Press Arnold',                     focus: 'HOMBRO',   muscles: ['shoulders', 'arms'] },
  { name: 'Elevaciones laterales',            focus: 'HOMBRO',   muscles: ['shoulders'] },
  { name: 'Elevaciones frontales',            focus: 'HOMBRO',   muscles: ['shoulders'] },
  { name: 'Pájaros (deltoide posterior)',      focus: 'HOMBRO',   muscles: ['shoulders', 'back'] },
  { name: 'Encogimientos (trapecio)',          focus: 'HOMBRO',   muscles: ['back', 'shoulders'] },
  // Brazo
  { name: 'Curl con barra',                   focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Curl con mancuernas',              focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Curl martillo',                    focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Curl predicador',                  focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Press francés',                    focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Extensión de tríceps en polea',    focus: 'BRAZO',    muscles: ['arms'] },
  { name: 'Fondos en banco',                  focus: 'BRAZO',    muscles: ['arms', 'chest'] },
  // Pierna
  { name: 'Sentadilla con barra',             focus: 'PIERNA',   muscles: ['legs', 'back', 'abs'] },
  { name: 'Prensa de pierna',                 focus: 'PIERNA',   muscles: ['legs'] },
  { name: 'Peso muerto rumano',               focus: 'PIERNA',   muscles: ['legs', 'back'] },
  { name: 'Zancadas',                         focus: 'PIERNA',   muscles: ['legs', 'abs'] },
  { name: 'Extensión de cuádriceps',          focus: 'PIERNA',   muscles: ['legs'] },
  { name: 'Curl femoral',                     focus: 'PIERNA',   muscles: ['legs'] },
  { name: 'Hip thrust',                       focus: 'PIERNA',   muscles: ['legs', 'abs'] },
  { name: 'Elevación de gemelos',             focus: 'PIERNA',   muscles: ['legs'] },
  { name: 'Sentadilla búlgara',               focus: 'PIERNA',   muscles: ['legs'] },
  // Core
  { name: 'Plancha',                          focus: 'CORE',     muscles: ['abs', 'shoulders', 'arms'] },
  { name: 'Abdominales (crunch)',              focus: 'CORE',     muscles: ['abs'] },
  { name: 'Elevación de piernas',             focus: 'CORE',     muscles: ['abs'] },
  { name: 'Russian twist',                    focus: 'CORE',     muscles: ['abs'] },
  { name: 'Rueda abdominal',                  focus: 'CORE',     muscles: ['abs', 'arms', 'shoulders'] },
  { name: 'Plancha lateral',                  focus: 'CORE',     muscles: ['abs'] },
  // Cardio
  { name: 'Trote',                            focus: 'CARDIO',   muscles: ['legs', 'abs'] },
  { name: 'Bicicleta',                        focus: 'CARDIO',   muscles: ['legs'] },
  { name: 'Elíptica',                         focus: 'CARDIO',   muscles: ['legs', 'arms'] },
  { name: 'Saltar la cuerda',                 focus: 'CARDIO',   muscles: ['legs', 'arms'] },
  { name: 'Remo (máquina)',                   focus: 'CARDIO',   muscles: ['back', 'arms', 'legs'] },
  { name: 'Escaladora',                       focus: 'CARDIO',   muscles: ['legs', 'arms', 'abs'] },
  // Full body
  { name: 'Burpees',                          focus: 'FULL_BODY', muscles: ['chest', 'arms', 'legs', 'abs', 'shoulders'] },
  { name: 'Thrusters',                        focus: 'FULL_BODY', muscles: ['legs', 'shoulders', 'arms'] },
  { name: 'Kettlebell swing',                 focus: 'FULL_BODY', muscles: ['back', 'legs', 'abs'] },
  { name: 'Clean and press',                  focus: 'FULL_BODY', muscles: ['shoulders', 'back', 'legs', 'arms'] },
  { name: 'Snatch con mancuerna',             focus: 'FULL_BODY', muscles: ['shoulders', 'back', 'legs', 'arms'] },
];

/** Build a lookup map for O(1) muscle resolution by name (lowercase). */
const CATALOG_MAP = new Map(EXERCISE_CATALOG.map((e) => [e.name.toLowerCase(), e.muscles]));

const FOCUS_MUSCLES: Record<ConditioningFocus, MuscleRegion[]> = {
  PECHO:     ['chest'],
  ESPALDA:   ['back'],
  HOMBRO:    ['shoulders'],
  BRAZO:     ['arms'],
  PIERNA:    ['legs'],
  CORE:      ['abs'],
  CARDIO:    ['chest', 'abs', 'arms', 'legs', 'shoulders', 'back'],
  FULL_BODY: ['chest', 'abs', 'arms', 'legs', 'shoulders', 'back'],
};

/**
 * Returns the union of muscles for a list of exercise names.
 * Names not in the catalog are silently ignored.
 */
export function getMusclesFromNames(names: string[]): MuscleRegion[] {
  const out = new Set<MuscleRegion>();
  for (const name of names) {
    const muscles = CATALOG_MAP.get(name.trim().toLowerCase());
    if (muscles) muscles.forEach((m) => out.add(m));
  }
  return [...out];
}

/**
 * Returns muscles for a focus chip — used as fallback when no exercise names are known.
 */
export function getMusclesFromFocus(focus: ConditioningFocus | null): MuscleRegion[] {
  return focus ? FOCUS_MUSCLES[focus] : [];
}

/**
 * Suggestions for the exercise name input: the student's recent names first, then catalog
 * entries for the chosen focus, then the rest. Filtered by the typed query, deduped, capped.
 */
export function suggestExercises(query: string, focus: ConditioningFocus | null, recents: string[], limit = 8): string[] {
  const q = query.trim().toLowerCase();
  const ordered = [
    ...recents,
    ...EXERCISE_CATALOG.filter((e) => focus && e.focus === focus).map((e) => e.name),
    ...EXERCISE_CATALOG.map((e) => e.name),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of ordered) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (key === q) continue;
    if (q && !key.includes(q)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}
