import { useMemo, useState } from 'react';
import type { ConditioningFocus, ConditioningSessionForm } from '../../types';
import { tapLight } from '../../native/haptics';
import { getMusclesFromFocus, getMusclesFromNames, suggestExercises } from './exerciseCatalog';
import BodyDiagram from './sections/BodyDiagram';

const FOCUS_OPTIONS: Array<[ConditioningFocus, string]> = [
  ['PIERNA', '🦵 Pierna'], ['ESPALDA', '🔙 Espalda'], ['PECHO', '🎯 Pecho'], ['HOMBRO', '🤲 Hombro'],
  ['BRAZO', '💪 Brazo'], ['CORE', '🧱 Core'], ['CARDIO', '🏃 Cardio'], ['FULL_BODY', '🔥 Full body'],
];
const DURATIONS = [30, 45, 60, 90];

function ymdOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const DATE_OPTIONS = [
  { label: 'Hoy', days: 0 },
  { label: 'Ayer', days: 1 },
  { label: 'Anteayer', days: 2 },
];

type RestUnit = 'seg' | 'min';
type SetRow = { reps: string; weight: string };
type ExerciseRow = { name: string; rest: string; restUnit: RestUnit; sets: SetRow[] };

const emptySet = (): SetRow => ({ reps: '', weight: '' });
const emptyExercise = (): ExerciseRow => ({ name: '', rest: '', restUnit: 'seg', sets: [emptySet()] });

interface Props {
  recentExercises: string[];
  onClose: () => void;
  onSave: (data: ConditioningSessionForm) => Promise<void>;
}

/** Quick strength & conditioning log: focus + exercises (each with weight/reps per set). */
export default function ConditioningForm({ recentExercises, onClose, onSave }: Props) {
  const dateOptions = useMemo(() => DATE_OPTIONS.map((o) => ({ ...o, value: ymdOffset(o.days) })), []);
  const [date, setDate] = useState<string>(dateOptions[0].value);
  const [focus, setFocus] = useState<ConditioningFocus | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [activeEx, setActiveEx] = useState<number | null>(null); // which exercise input shows suggestions
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const num = (v: string): number | null => (v.trim() === '' ? null : Math.max(0, parseFloat(v.replace(',', '.')) || 0));
  const intNum = (v: string): number | null => (v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0));

  // Live muscle diagram: derive from exercise names, fall back to focus chip
  const liveMuscles = useMemo(() => {
    const names = exercises.map((e) => e.name).filter(Boolean);
    return names.length > 0 ? getMusclesFromNames(names) : getMusclesFromFocus(focus);
  }, [exercises, focus]);

  const patchExercise = (i: number, patch: Partial<ExerciseRow>) =>
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const patchSet = (ei: number, si: number, patch: Partial<SetRow>) =>
    setExercises((prev) => prev.map((e, idx) =>
      idx === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e));
  const addSet = (ei: number) => { void tapLight(); patchExercise(ei, { sets: [...exercises[ei].sets, emptySet()] }); };
  const removeSet = (ei: number, si: number) =>
    setExercises((prev) => prev.map((e, idx) =>
      idx === ei ? { ...e, sets: e.sets.length > 1 ? e.sets.filter((_, j) => j !== si) : e.sets } : e));
  const addExercise = () => { void tapLight(); setExercises((prev) => [...prev, emptyExercise()]); };
  const removeExercise = (ei: number) => setExercises((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== ei) : prev));

  const handleSave = async () => {
    if (saving) return;
    const cleaned = exercises
      .filter((e) => e.name.trim())
      .map((e) => {
        const rest = num(e.rest);
        return {
          name: e.name.trim(),
          restSec: rest == null ? null : Math.round(rest * (e.restUnit === 'min' ? 60 : 1)),
          sets: e.sets.map((s) => ({ reps: intNum(s.reps), weightKg: num(s.weight) })),
        };
      });
    setSaving(true);
    try {
      await onSave({
        date,
        backdated: date !== dateOptions[0].value,
        focus,
        durationMin,
        notes: notes.trim() || null,
        exercises: cleaned,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-gray-50 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto pb-safe shadow-2xl">
        <div className="sticky top-0 bg-gray-50/95 backdrop-blur px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Acondicionamiento físico</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          <Group label="Fecha">
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((o) => (
                <Chip key={o.days} active={date === o.value} onClick={() => { void tapLight(); setDate(o.value); }}>{o.label}</Chip>
              ))}
            </div>
            {date !== dateOptions[0].value && (
              <p className="text-xs text-amber-600 mt-2">Registro atrasado: queda en tu historial pero <b>no suma a la racha</b>.</p>
            )}
          </Group>

          <Group label="Foco">
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map(([key, label]) => (
                <Chip key={key} active={focus === key} onClick={() => { void tapLight(); setFocus(focus === key ? null : key); }}>{label}</Chip>
              ))}
            </div>
          </Group>

          {liveMuscles.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center mb-2">Músculos trabajados</p>
              <BodyDiagram muscles={liveMuscles} />
            </div>
          )}

          <Group label="Ejercicios">
            <div className="space-y-3">
              {exercises.map((ex, ei) => (
                <div key={ei} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={ex.name}
                      onChange={(e) => patchExercise(ei, { name: e.target.value })}
                      onFocus={() => setActiveEx(ei)}
                      onBlur={() => setTimeout(() => setActiveEx((cur) => (cur === ei ? null : cur)), 150)}
                      placeholder={`Ejercicio ${ei + 1} (ej. Sentadilla)`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {exercises.length > 1 && (
                      <button onClick={() => removeExercise(ei)} className="text-gray-300 hover:text-red-500 px-1" aria-label="Quitar ejercicio">🗑</button>
                    )}
                  </div>

                  {activeEx === ei && (() => {
                    const sugg = suggestExercises(ex.name, focus, recentExercises);
                    return sugg.length === 0 ? null : (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {sugg.map((name) => (
                          <button
                            key={name}
                            // mousedown fires before the input's blur, so the value sets reliably
                            onMouseDown={(e) => { e.preventDefault(); patchExercise(ei, { name }); }}
                            className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200 hover:border-primary-300"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    {ex.sets.map((s, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <span className="w-12 text-xs text-gray-400 flex-shrink-0">Serie {si + 1}</span>
                        <input
                          type="number" inputMode="numeric" min={0} value={s.reps}
                          onChange={(e) => patchSet(ei, si, { reps: e.target.value })}
                          placeholder="reps"
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-400">×</span>
                        <input
                          type="number" inputMode="decimal" min={0} step="0.5" value={s.weight}
                          onChange={(e) => patchSet(ei, si, { weight: e.target.value })}
                          placeholder="kg"
                          className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-400">kg</span>
                        {ex.sets.length > 1 && (
                          <button onClick={() => removeSet(ei, si)} className="text-gray-300 hover:text-gray-500 ml-auto px-1">×</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <button onClick={() => addSet(ei)} className="text-xs font-semibold text-primary-600 hover:text-primary-700">+ serie</button>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Descanso</span>
                      <input
                        type="number" inputMode={ex.restUnit === 'min' ? 'decimal' : 'numeric'} min={0}
                        step={ex.restUnit === 'min' ? '0.5' : '1'} value={ex.rest}
                        onChange={(e) => patchExercise(ei, { rest: e.target.value })}
                        placeholder={ex.restUnit}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => { void tapLight(); patchExercise(ei, { restUnit: ex.restUnit === 'seg' ? 'min' : 'seg' }); }}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 w-9 text-center"
                        aria-label="Cambiar unidad de descanso"
                      >
                        {ex.restUnit}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addExercise} className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors">
              + Agregar ejercicio
            </button>
          </Group>

          <Group label="Duración">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip key={d} active={durationMin === d} onClick={() => setDurationMin(durationMin === d ? null : d)}>{d} min</Chip>
              ))}
            </div>
          </Group>

          <Group label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="¿Cómo te sentiste? ¿Algún PR?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{notes.length}/500</p>
          </Group>
        </div>

        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur px-5 py-3 border-t border-gray-200 flex gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
      }`}
    >
      {children}
    </button>
  );
}
