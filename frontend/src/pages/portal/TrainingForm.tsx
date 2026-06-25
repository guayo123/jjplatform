import { useMemo, useState } from 'react';
import type {
  Classmate,
  StudentDiscipline,
  TrainingModality,
  TrainingPartner,
  TrainingSession,
  TrainingSessionForm,
  TrainingSubmission,
} from '../../types';
import { tapLight } from '../../native/haptics';

// Detects BJJ-style disciplines, where the Gi/No-Gi dimension applies.
export function isBjj(name: string | null | undefined): boolean {
  return !!name && /jiu|jitsu|bjj|grappling/i.test(name);
}

const DEFAULT_TECHNIQUES = [
  'Guardia cerrada', 'Paso de guardia', 'Montada', 'Control lateral',
  'Raspado', 'Toma de espalda', 'Derribo', 'Defensa', 'Media guardia',
];
// Chips visibles de un toque (los más comunes + Mano de vaca y Botinha pedidas aparte).
const DEFAULT_SUBMISSIONS = [
  'Mataleón', 'Llave de brazo', 'Triángulo', 'Kimura', 'Guillotina',
  'Americana', 'Omoplata', 'Estrangulación', 'Darce', 'Ezekiel',
  'Mano de vaca', 'Botinha',
];
// Catálogo completo para el autocompletado del buscador "Agregar otra".
const SUBMISSION_CATALOG = [
  ...DEFAULT_SUBMISSIONS,
  'Arco y flecha', 'Heel hook', 'Kneebar', 'Toe hold', 'Estrangulación norte-sur',
  'Anaconda', 'Peruvian necktie', 'Gogoplata', 'Biceps slicer', 'Calf slicer',
  'Llave de tobillo', 'Estrangulación en triángulo', 'Crucifijo', 'Bate de béisbol',
];

const DURATIONS = [30, 45, 60, 90];

// Backdating: a forgotten session can be logged for today or the two previous days only
// (record-keeping). Uses the device's LOCAL date so it matches the streak's day boundaries.
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

interface Props {
  disciplines: StudentDiscipline[];
  recentSessions: TrainingSession[];
  classmates: Classmate[];
  onClose: () => void;
  onSave: (data: TrainingSessionForm) => Promise<void>;
}

/**
 * Quick training-log sheet. Designed to be completable in < 30s: modality + Guardar
 * is enough; everything else is optional and tap-driven (chips, steppers, ratings).
 */
export default function TrainingForm({ disciplines, recentSessions, classmates, onClose, onSave }: Props) {
  const bjjDisc = disciplines.find((d) => isBjj(d.disciplineName));
  const dateOptions = useMemo(() => DATE_OPTIONS.map((o) => ({ ...o, value: ymdOffset(o.days) })), []);
  const [date, setDate] = useState<string>(dateOptions[0].value);
  const [disciplineId, setDisciplineId] = useState<number | null>(
    bjjDisc?.disciplineId ?? disciplines[0]?.disciplineId ?? null,
  );
  const selectedDisc = disciplines.find((d) => d.disciplineId === disciplineId);
  const showModality = isBjj(selectedDisc?.disciplineName);

  const [modality, setModality] = useState<TrainingModality | null>('GI');
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [roundsCount, setRoundsCount] = useState<number>(0);
  const [energy, setEnergy] = useState<number | null>(null);
  const [performance, setPerformance] = useState<number | null>(null);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<TrainingSubmission[]>([]);
  const [partners, setPartners] = useState<TrainingPartner[]>([]);
  const [notes, setNotes] = useState('');
  const [techInput, setTechInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [partnerInput, setPartnerInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Merge the user's most-used values with the default catalog so repeat entries are one tap.
  const techChips = useMemo(
    () => mergeChips(DEFAULT_TECHNIQUES, recentSessions.flatMap((s) => s.techniques)),
    [recentSessions],
  );
  const subChips = useMemo(
    () => mergeChips(DEFAULT_SUBMISSIONS, recentSessions.flatMap((s) => s.submissions.map((x) => x.name)), 14),
    [recentSessions],
  );
  // Autocomplete for the submission search: suggest from the full catalog + the user's own history,
  // matching accent-insensitively, hiding the ones already shown as chips.
  const subSuggestions = useMemo(() => {
    const q = normalize(subInput);
    if (!q) return [];
    const pool = mergeChips([...SUBMISSION_CATALOG, ...recentSessions.flatMap((s) => s.submissions.map((x) => x.name))], [], 100);
    return pool.filter((s) => normalize(s).includes(q) && !subChips.includes(s)).slice(0, 6);
  }, [subInput, subChips, recentSessions]);

  // Partner suggestions: real classmates first, then names used in past sessions, filtered
  // by the search box and excluding ones already added.
  const partnerSuggestions = useMemo<TrainingPartner[]>(() => {
    const fromClassmates: TrainingPartner[] = classmates.map((c) => ({ name: c.name, belt: c.belt, partnerStudentId: c.id }));
    const known = new Set(fromClassmates.map((c) => c.name.toLowerCase()));
    const fromHistory: TrainingPartner[] = [...new Set(recentSessions.flatMap((s) => s.partners.map((p) => p.name)))]
      .filter((n) => !known.has(n.toLowerCase()))
      .map((n) => ({ name: n, belt: null, partnerStudentId: null }));
    const q = partnerInput.trim().toLowerCase();
    const added = new Set(partners.map((p) => p.name.toLowerCase()));
    return [...fromClassmates, ...fromHistory]
      .filter((c) => !added.has(c.name.toLowerCase()))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [classmates, recentSessions, partnerInput, partners]);

  const toggleTechnique = (t: string) => {
    void tapLight();
    setTechniques((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };
  const addTechniqueInput = () => {
    const t = techInput.trim();
    if (t && !techniques.includes(t)) setTechniques((prev) => [...prev, t]);
    setTechInput('');
  };
  const addSubmission = (name: string) => {
    void tapLight();
    setSubmissions((prev) => [...prev, { name, direction: 'LOGRADA' }]);
  };
  const setSubDirection = (idx: number, direction: TrainingSubmission['direction']) => {
    setSubmissions((prev) => prev.map((s, i) => (i === idx ? { ...s, direction } : s)));
  };
  const removeSubmission = (idx: number) => {
    setSubmissions((prev) => prev.filter((_, i) => i !== idx));
  };
  const addSubmissionInput = () => {
    const t = subInput.trim();
    if (t) addSubmission(t);
    setSubInput('');
  };
  const addPartner = (p: TrainingPartner) => {
    void tapLight();
    setPartners((prev) => (prev.some((x) => x.name.toLowerCase() === p.name.toLowerCase()) ? prev : [...prev, p]));
    setPartnerInput('');
  };
  const addFreePartner = () => {
    const n = partnerInput.trim();
    if (n) addPartner({ name: n, belt: null, partnerStudentId: null });
  };
  const removePartner = (idx: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        disciplineId,
        date,
        // Anything other than "Hoy" is a late entry → recorded, but won't extend the streak.
        backdated: date !== dateOptions[0].value,
        modality: showModality ? modality : null,
        durationMin,
        roundsCount: roundsCount > 0 ? roundsCount : null,
        energy,
        performance,
        notes: notes.trim() || null,
        techniques,
        submissions,
        partners,
      });
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el entrenamiento. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-gray-50 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto pb-safe shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50/95 backdrop-blur px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Registrar entrenamiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Date — defaults to today; allows logging a forgotten session up to 2 days back */}
          <Group label="Fecha">
            <div className="flex flex-wrap gap-2">
              {dateOptions.map((o) => (
                <Chip key={o.days} active={date === o.value} onClick={() => { void tapLight(); setDate(o.value); }}>
                  {o.label}
                </Chip>
              ))}
            </div>
            {date !== dateOptions[0].value && (
              <p className="text-xs text-amber-600 mt-2">
                Registro atrasado: queda en tu historial pero <b>no suma a la racha</b>.
              </p>
            )}
          </Group>

          {/* Discipline (only if more than one) */}
          {disciplines.length > 1 && (
            <Group label="Disciplina">
              <div className="flex flex-wrap gap-2">
                {disciplines.map((d) => (
                  <Chip key={d.disciplineId} active={d.disciplineId === disciplineId} onClick={() => setDisciplineId(d.disciplineId)}>
                    {d.disciplineName}
                  </Chip>
                ))}
              </div>
            </Group>
          )}

          {/* Session type — first and most prominent for BJJ */}
          {showModality && (
            <Group label="Tipo de sesión">
              <div className="grid grid-cols-2 gap-2">
                <BigToggle active={modality === 'GI'} onClick={() => { void tapLight(); setModality('GI'); }}>🥋 Gi</BigToggle>
                <BigToggle active={modality === 'NOGI'} onClick={() => { void tapLight(); setModality('NOGI'); }}>👕 No-Gi</BigToggle>
                <BigToggle active={modality === 'OPEN_MAT'} onClick={() => { void tapLight(); setModality('OPEN_MAT'); }}>🤝 Open Mat</BigToggle>
                <BigToggle active={modality === 'COMPETITION'} onClick={() => { void tapLight(); setModality('COMPETITION'); }}>🏆 Competición</BigToggle>
              </div>
            </Group>
          )}

          {/* Duration */}
          <Group label="Duración">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip key={d} active={durationMin === d} onClick={() => setDurationMin(durationMin === d ? null : d)}>
                  {d} min
                </Chip>
              ))}
            </div>
          </Group>

          {/* Rounds */}
          <Group label="Rounds de sparring">
            <Stepper value={roundsCount} onChange={setRoundsCount} />
          </Group>

          {/* Submissions with direction */}
          <Group label="Sumisiones">
            <div className="flex flex-wrap gap-2 mb-3">
              {subChips.map((s) => (
                <Chip key={s} onClick={() => addSubmission(s)}>+ {s}</Chip>
              ))}
            </div>
            <div className="mb-3">
              <div className="flex gap-2">
                <input
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubmissionInput(); } }}
                  placeholder="Buscar o agregar otra…"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button onClick={addSubmissionInput} className="px-3 py-2 text-sm bg-gray-200 rounded-lg text-gray-700">Añadir</button>
              </div>
              {/* Smart search: suggestions from the full catalog as the user types. */}
              {subSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {subSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { addSubmission(s); setSubInput(''); }}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border bg-primary-50 text-primary-700 border-primary-500"
                    >+ {s}</button>
                  ))}
                </div>
              )}
            </div>
            {submissions.length > 0 && (
              <div className="space-y-2">
                {submissions.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100">
                    <span className="flex-1 text-sm text-gray-800 truncate">{s.name}</span>
                    <button
                      onClick={() => setSubDirection(idx, 'LOGRADA')}
                      className={`text-xs px-2 py-1 rounded-md font-medium ${s.direction === 'LOGRADA' ? 'bg-green-100 text-green-700' : 'text-gray-400'}`}
                    >Logré</button>
                    <button
                      onClick={() => setSubDirection(idx, 'RECIBIDA')}
                      className={`text-xs px-2 py-1 rounded-md font-medium ${s.direction === 'RECIBIDA' ? 'bg-red-100 text-red-600' : 'text-gray-400'}`}
                    >Me hicieron</button>
                    <button onClick={() => removeSubmission(idx)} className="text-gray-300 hover:text-gray-500 px-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </Group>

          {/* Techniques */}
          <Group label="Técnicas trabajadas">
            <div className="flex flex-wrap gap-2 mb-2">
              {/* Show the fixed catalog plus any custom technique the user typed in, so "Añadir" gives visible feedback. */}
              {[...techChips, ...techniques.filter((t) => !techChips.includes(t))].map((t) => (
                <Chip key={t} active={techniques.includes(t)} onClick={() => toggleTechnique(t)}>{t}</Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTechniqueInput(); } }}
                placeholder="Agregar otra…"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={addTechniqueInput} className="px-3 py-2 text-sm bg-gray-200 rounded-lg text-gray-700">Añadir</button>
            </div>
          </Group>

          {/* Training partners — picked from real classmates, or free text */}
          <Group label="Compañeros">
            {partners.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {partners.map((p, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-full pl-3 pr-1.5 py-1 text-sm">
                    {p.name}{p.belt && <span className="text-xs text-primary-500">· {p.belt}</span>}
                    <button onClick={() => removePartner(idx)} className="text-primary-400 hover:text-primary-600 text-base leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={partnerInput}
              onChange={(e) => setPartnerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (partnerSuggestions[0]) addPartner(partnerSuggestions[0]);
                  else addFreePartner();
                }
              }}
              placeholder="Buscar compañero…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            />
            {partnerSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {partnerSuggestions.map((c) => (
                  <Chip key={c.partnerStudentId ?? c.name} onClick={() => addPartner(c)}>
                    + {c.name}{c.belt ? ` · ${c.belt}` : ''}
                  </Chip>
                ))}
              </div>
            )}
            {partnerInput.trim() &&
              !partnerSuggestions.some((c) => c.name.toLowerCase() === partnerInput.trim().toLowerCase()) && (
                <button onClick={addFreePartner} className="mt-2 text-sm text-primary-600 font-medium">
                  + Agregar "{partnerInput.trim()}"
                </button>
              )}
          </Group>

          {/* Energy & performance */}
          <div className="grid grid-cols-2 gap-4">
            <Group label="Energía">
              <Rating value={energy} onChange={setEnergy} icon="⚡" />
            </Group>
            <Group label="Rendimiento">
              <Rating value={performance} onChange={setPerformance} icon="⭐" />
            </Group>
          </div>

          {/* Notes */}
          <Group label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="¿Qué aprendiste hoy? ¿Qué mejorar?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{notes.length}/500</p>
          </Group>
        </div>

        {/* Save bar — Cancelar lives here too so closing is always within reach
            (the header × can sit far up the top of a long form). */}
        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur px-5 py-3 border-t border-gray-200 flex flex-col gap-3">
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar entrenamiento'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Most-used first (by frequency), then any catalog defaults not already present.
/** Lowercase + strip accents so "mataleon" matches "Mataleón". */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function mergeChips(defaults: string[], used: string[], limit = 12): string[] {
  const freq = new Map<string, number>();
  for (const u of used) freq.set(u, (freq.get(u) ?? 0) + 1);
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const out: string[] = [];
  for (const name of [...ranked, ...defaults]) {
    if (!out.includes(name)) out.push(name);
  }
  return out.slice(0, limit);
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

function BigToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 rounded-xl text-base font-semibold border-2 transition-colors ${
        active ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-gray-200 text-gray-500'
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 text-xl font-bold">−</button>
      <span className="text-xl font-bold text-gray-900 w-8 text-center">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-10 h-10 rounded-full bg-primary-600 text-white text-xl font-bold">+</button>
    </div>
  );
}

function Rating({ value, onChange, icon }: { value: number | null; onChange: (v: number) => void; icon: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => { void tapLight(); onChange(n); }}
          className={`text-xl transition-opacity ${value != null && n <= value ? 'opacity-100' : 'opacity-25'}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
