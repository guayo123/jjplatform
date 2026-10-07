/** Piezas compartidas por la vista de árbol (escritorio) y la vista por rondas (celular) del bracket. */

export const RESULT_TYPES: { value: string; label: string; short: string; color: string }[] = [
  { value: 'SUMISION',         label: 'Finalización / Sumisión', short: 'Sub',      color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
  { value: 'PUNTOS',           label: 'Puntos',                  short: 'Pts',      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  { value: 'VENTAJAS',         label: 'Ventajas',                short: 'Vent',     color: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200' },
  { value: 'PENALIZACIONES',   label: 'Penalizaciones',          short: 'Penal',    color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
  { value: 'DECISION_ARBITRO', label: 'Decisión del Árbitro',    short: 'Árbitro',  color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  { value: 'DESCALIFICACION',  label: 'Descalificación',         short: 'Descalif', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
];

/** Nombre con la estrella de cabeza de serie, si la tiene. */
export function seededName(p: { studentName: string; seedRank?: number | null }) {
  return p.seedRank != null ? `⭐#${p.seedRank} ${p.studentName}` : p.studentName;
}

export function resultLabel(rt: string | null) {
  return RESULT_TYPES.find((r) => r.value === rt);
}

export type ResultHandler = (matchId: number, winnerId: number, resultType: string) => void;
