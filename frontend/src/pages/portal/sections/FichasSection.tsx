import { useState } from 'react';
import type { StudentDiscipline, BeltPromotion, TechniqueCurriculum, Birthday, CompetitionResult, CompetitionResultForm } from '../../../types';
import BeltImage from '../../../components/BeltImage';
import { formatDate, BeltBadge, SkeletonRows, TYPE_CONFIG } from './shared';
import CurriculumCard from './CurriculumCard';
import { tapLight } from '../../../native/haptics';

interface Props {
  disciplines: StudentDiscipline[];
  promotions: BeltPromotion[];
  detailLoading: boolean;
  expandedDisc: number | null;
  setExpandedDisc: (id: number | null) => void;
  curriculum: TechniqueCurriculum[];
  onToggleTechnique: (techniqueId: number, learned: boolean) => void;
  /** Save a competition result (add when resultId is null, otherwise edit). */
  onSaveResult: (studentDisciplineId: number, resultId: number | null, form: CompetitionResultForm) => Promise<void>;
  birthdays: Birthday[];
}

/** "Fichas técnicas" — per-discipline belt/grade history, competition results & technique program. */
export default function FichasSection({ disciplines, promotions, detailLoading, expandedDisc, setExpandedDisc, curriculum, onToggleTechnique, onSaveResult, birthdays }: Props) {
  // The competition result being added/edited: { sdId, result } (result null = new torneo).
  const [editing, setEditing] = useState<{ sdId: number; result: CompetitionResult | null } | null>(null);
  return (
    <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Fichas técnicas</h2>
        <p className="text-xs text-gray-400 mt-0.5">{disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-5 space-y-4">
        {detailLoading ? (
          <SkeletonRows rows={4} />
        ) : disciplines.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Sin disciplinas registradas</p>
        ) : (
          disciplines.map((disc, idx) => {
            const isExpanded = expandedDisc === disc.id;
            const discPromos = promotions.filter((p) => p.studentDisciplineId === disc.id && !p.deleted);
            return (
              <div key={disc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap" data-tour={idx === 0 ? 'grados' : undefined}>
                      <span className="font-semibold text-gray-900 text-sm">{disc.disciplineName}</span>
                      {disc.ageCategoryName && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{disc.ageCategoryName}</span>
                      )}
                      {disc.belt && <BeltBadge belt={disc.belt} colorHex={disc.beltColorHex} />}
                      {disc.stripes > 0 && <span className="text-amber-400 text-xs">{'★'.repeat(disc.stripes)}</span>}
                    </div>
                    {disc.joinDate && <p className="text-xs text-gray-400 mt-1">Ingresó: {formatDate(disc.joinDate)}</p>}
                  </div>
                  <button
                    data-tour={idx === 0 ? 'historial' : undefined}
                    onClick={() => setExpandedDisc(isExpanded ? null : disc.id)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                      isExpanded ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-700'
                    }`}
                  >
                    📋 Historial
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-5">
                    {/* Belt / grade history */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Historial de graduaciones</h4>
                      {discPromos.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Sin registros</p>
                      ) : (
                        <div className="space-y-2">
                          {discPromos.map((promo) => {
                            const tc = TYPE_CONFIG[promo.type];
                            const beltChange = promo.fromBelt && promo.fromBelt !== promo.toBelt;
                            return (
                              <div key={promo.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base flex-shrink-0">{tc.icon}</span>
                                  <span className={`text-xs font-semibold ${tc.color}`}>{tc.label}</span>
                                  {beltChange && (
                                    <span className="text-xs text-gray-400">desde {promo.fromBelt}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-auto">{formatDate(promo.promotionDate)}</span>
                                </div>
                                {/* Resulting belt with its degrees attached, like the promotion celebration */}
                                <div className="mt-2">
                                  <BeltImage belt={promo.toBelt} stripes={promo.toStripes} className="max-w-[220px]" />
                                </div>
                                {promo.notes && <p className="text-xs text-gray-400 italic mt-1.5">"{promo.notes}"</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Competition results — the student manages their own torneos here */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resultados de competición</h4>
                        <button
                          onClick={() => { void tapLight(); setEditing({ sdId: disc.id, result: null }); }}
                          className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
                        >
                          ➕ Agregar torneo
                        </button>
                      </div>
                      {disc.competitionResults.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Aún no registras torneos. ¡Agrega el primero!</p>
                      ) : (
                        <div className="space-y-2">
                          {disc.competitionResults.map((result) => (
                            <div key={result.id} className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm text-gray-900">{result.tournamentName}</p>
                                <button
                                  onClick={() => { void tapLight(); setEditing({ sdId: disc.id, result }); }}
                                  className="text-xs text-gray-400 hover:text-primary-700 flex-shrink-0"
                                  aria-label="Editar torneo"
                                >
                                  ✎ Editar
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                                <span>{formatDate(result.date)}</span>
                                {result.placement && <span>🏅 {result.placement}</span>}
                                {result.category && <span>⚖️ {result.category}</span>}
                              </div>
                              {result.notes && <p className="text-xs text-gray-400 italic mt-1">"{result.notes}"</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>

    <CurriculumCard curriculum={curriculum} loading={detailLoading} onToggle={onToggleTechnique} />

    <BirthdaysCard birthdays={birthdays} />

    {editing && (
      <ResultFormModal
        result={editing.result}
        onClose={() => setEditing(null)}
        onSave={async (form) => {
          await onSaveResult(editing.sdId, editing.result?.id ?? null, form);
          setEditing(null);
        }}
      />
    )}
    </div>
  );
}

/** Add/edit form for a student's own competition result (torneo). */
function ResultFormModal({ result, onClose, onSave }: {
  result: CompetitionResult | null;
  onClose: () => void;
  onSave: (form: CompetitionResultForm) => Promise<void>;
}) {
  const [tournamentName, setTournamentName] = useState(result?.tournamentName ?? '');
  const [date, setDate] = useState(result?.date ?? new Date().toISOString().slice(0, 10));
  const [placement, setPlacement] = useState(result?.placement ?? '');
  const [category, setCategory] = useState(result?.category ?? '');
  const [notes, setNotes] = useState(result?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (saving) return;
    if (!tournamentName.trim()) { setError('Ponle nombre al torneo.'); return; }
    if (!date) { setError('Indica la fecha.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        tournamentName: tournamentName.trim(),
        date,
        placement: placement.trim(),
        category: category.trim(),
        notes: notes.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-gray-50 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto pb-safe shadow-2xl">
        <div className="sticky top-0 bg-gray-50/95 backdrop-blur px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{result ? 'Editar torneo' : 'Agregar torneo'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Torneo">
            <input
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="Ej. Copa Apertura"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
            </Field>
            <Field label="Resultado">
              <input
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                placeholder="Ej. 1er lugar"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
            </Field>
          </div>
          <Field label="Categoría (opcional)">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Adulto -76kg azul"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            />
          </Field>
          <Field label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="Ej. gané la final por sumisión"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </Field>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur px-5 py-3 border-t border-gray-200">
          <button
            onClick={submit}
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando…' : result ? 'Guardar cambios' : 'Agregar torneo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}

/** "Cumpleaños del mes" — academy classmates whose birthday is this month; today's is highlighted. */
function BirthdaysCard({ birthdays }: { birthdays: Birthday[] }) {
  if (birthdays.length === 0) return null; // hidden until there are birthdays this month
  const monthName = new Date().toLocaleDateString('es-CL', { month: 'long' });
  const todayDay = new Date().getDate();
  return (
    <div className="bg-white rounded-xl shadow-sm jjp-accent-bar">
      <div className="p-5 pl-6 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">🎂 Cumpleaños de {monthName}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Celebra a tus compañeros de academia</p>
      </div>
      <ul className="p-3 pl-4">
        {birthdays.map((b) => {
          const isToday = b.day === todayDay;
          return (
            <li key={b.id} className={`flex items-center gap-3 rounded-lg px-2 py-2 ${isToday ? 'bg-orange-50' : ''}`}>
              {b.photoUrl ? (
                <img src={b.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {b.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{b.name}</span>
              {isToday ? (
                <span className="text-xs font-bold text-orange-600 flex-shrink-0">¡Hoy! 🎉</span>
              ) : (
                <span className="text-xs font-semibold text-gray-400 flex-shrink-0 tabular-nums">{b.day} {monthName.slice(0, 3)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
