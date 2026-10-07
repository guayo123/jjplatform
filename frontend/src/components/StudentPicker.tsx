import { useMemo, useState } from 'react';

export interface PickableStudent {
  id: number;
  name: string;
  belt?: string | null;
  weight?: number | null;
}

interface Props {
  students: PickableStudent[];
  /** Cupos libres del torneo; null si no tiene máximo. */
  slotsLeft: number | null;
  /** Debe devolver true si se inscribió bien (entonces se limpia la selección). */
  onAdd: (studentIds: number[]) => Promise<boolean>;
}

/** Lista con casillas y buscador para inscribir a varios alumnos de una sola vez. */
export default function StudentPicker({ students, slotsLeft, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
  }, [students, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const overLimit = slotsLeft !== null && selected.size > slotsLeft;

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((s) => next.delete(s.id));
      else filtered.forEach((s) => next.add(s.id));
      return next;
    });

  const submit = async () => {
    if (selected.size === 0 || overLimit) return;
    setSaving(true);
    try {
      if (await onAdd([...selected])) setSelected(new Set());
    } finally {
      setSaving(false);
    }
  };

  // Solo cuentan los seleccionados que siguen disponibles (por si alguien ya fue inscrito).
  const count = students.filter((s) => selected.has(s.id)).length;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar alumno..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
      />

      <div className="flex items-center justify-between gap-2 px-1 py-1.5 text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAllFiltered}
            disabled={filtered.length === 0}
            className="w-4 h-4"
          />
          <span className="font-medium text-gray-700">
            {query.trim() ? `Seleccionar los ${filtered.length} de la búsqueda` : `Seleccionar todos (${filtered.length})`}
          </span>
        </label>
        {slotsLeft !== null && (
          <span className={`text-xs ${overLimit ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
            {slotsLeft} cupo{slotsLeft === 1 ? '' : 's'} libre{slotsLeft === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">
            {students.length === 0 ? 'No hay alumnos disponibles para agregar.' : 'Ningún alumno coincide con la búsqueda.'}
          </p>
        ) : (
          filtered.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none ${
                selected.has(s.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-900 truncate">{s.name}</span>
                <span className="block text-xs text-gray-500">
                  {[s.belt, s.weight != null ? `${s.weight} kg` : null].filter(Boolean).join(' · ') || 'Sin datos'}
                </span>
              </span>
            </label>
          ))
        )}
      </div>

      {overLimit && (
        <p className="mt-2 text-xs text-red-600">
          Seleccionaste {count} y solo quedan {slotsLeft} cupo{slotsLeft === 1 ? '' : 's'}. Desmarca {count - (slotsLeft ?? 0)}.
        </p>
      )}

      <button
        onClick={submit}
        disabled={count === 0 || overLimit || saving}
        className="mt-3 w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Agregando...' : count === 0 ? 'Agregar' : `Agregar ${count} seleccionado${count === 1 ? '' : 's'}`}
      </button>
    </div>
  );
}
