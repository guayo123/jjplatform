import { useEffect, useState } from 'react';
import { academiesApi } from '../../api/academies';
import { professorsApi } from '../../api/professors';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import { useGuidedTour } from '../../utils/useGuidedTour';
import SchedulePosterModal from './SchedulePosterModal';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import type { Plan, Professor, Schedule, AcademySettings, ReservationRoster } from '../../types';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT: Record<string, string> = {
  Lunes: 'L', Martes: 'M', Miércoles: 'X', Jueves: 'J', Viernes: 'V', Sábado: 'S', Domingo: 'D',
};

const CLASS_COLORS = ['#EF4444','#3B82F6','#22C55E','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316'];
function classColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CLASS_COLORS[h % CLASS_COLORS.length];
}
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Spanish day name (as stored on ClassSchedule.dayOfWeek) → JS getDay() index.
const JS_DAY: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6,
};
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Next `count` calendar dates (ISO) whose weekday matches `dayName`, starting today. */
function nextOccurrences(dayName: string, count: number): string[] {
  const target = JS_DAY[dayName];
  if (target === undefined) return [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}
function fmtOccurrence(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

const BELT_CHIP: Record<string, string> = {
  Blanco: 'bg-gray-100 text-gray-700 border-gray-300',
  Azul: 'bg-blue-100 text-blue-700 border-blue-300',
  Morado: 'bg-purple-100 text-purple-700 border-purple-300',
  Marrón: 'bg-amber-100 text-amber-800 border-amber-300',
  Negro: 'bg-gray-800 text-white border-gray-700',
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

interface FormState {
  days: string[];
  dayOfWeek: string;
  planId: number | null;
  professorId: number | null;
  className: string;
  startTime: string;
  endTime: string;
  capacity: string;
}

const emptyForm = (): FormState => ({
  days: [],
  dayOfWeek: '',
  planId: null,
  professorId: null,
  className: '',
  startTime: '18:00',
  endTime: '19:30',
  capacity: '',
});

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; schedule: Schedule };

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [academy, setAcademy] = useState<AcademySettings | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  // Roster: who reserved a given class occurrence. `dates` = upcoming occurrences of that weekday.
  const [roster, setRoster] = useState<{
    schedule: Schedule;
    dates: string[];
    date: string;
    list: ReservationRoster[] | null;
    loading: boolean;
  } | null>(null);
  const { toast } = useToast();
  const confirm = useConfirm();

  const openRoster = (s: Schedule) => {
    const dates = nextOccurrences(s.dayOfWeek, 4);
    setRoster({ schedule: s, dates, date: dates[0] ?? toISODate(new Date()), list: null, loading: true });
  };

  const rosterSid = roster?.schedule.id;
  const rosterDate = roster?.date;
  useEffect(() => {
    if (rosterSid == null || !rosterDate) return;
    let cancelled = false;
    setRoster((r) => (r ? { ...r, loading: true } : r));
    academiesApi
      .getReservations(rosterSid, rosterDate)
      .then((list) => {
        if (!cancelled) setRoster((r) => (r && r.schedule.id === rosterSid && r.date === rosterDate ? { ...r, list, loading: false } : r));
      })
      .catch(() => {
        if (!cancelled) setRoster((r) => (r ? { ...r, list: [], loading: false } : r));
      });
    return () => { cancelled = true; };
  }, [rosterSid, rosterDate]);

  const load = () =>
    Promise.all([
      academiesApi.getSchedules(),
      academiesApi.getPlans(),
      professorsApi.list(),
    ]).then(([s, p, pr]) => {
      setSchedules(s);
      setPlans(p.filter((pl) => pl.active));
      setProfessors(pr.filter((x) => x.active));
    }).finally(() => setLoading(false));

  useEffect(() => {
    load();
    academiesApi.getSettings().then(setAcademy).catch(() => {});
  }, []);

  // Group by day
  const byDay = DAYS.reduce<Record<string, Schedule[]>>((acc, d) => {
    acc[d] = schedules.filter((s) => s.dayOfWeek === d).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    return acc;
  }, {});

  const openAdd = () => {
    setForm(emptyForm());
    setModal({ mode: 'add' });
  };

  const openEdit = (s: Schedule) => {
    setForm({
      days: [s.dayOfWeek],
      dayOfWeek: s.dayOfWeek,
      planId: s.planId,
      professorId: s.professorId,
      className: s.className,
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
      capacity: s.capacity != null ? String(s.capacity) : '',
    });
    setModal({ mode: 'edit', schedule: s });
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const selectedPlan = plans.find((p) => p.id === form.planId) ?? null;

  const handlePlanChange = (planId: number | null) => {
    const plan = plans.find((p) => p.id === planId) ?? null;
    setForm((f) => ({ ...f, planId, className: plan?.name ?? f.className }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.mode === 'add' && form.days.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }
    if (!form.planId) {
      toast.error('Selecciona un plan');
      return;
    }
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        const updated = await academiesApi.updateSchedule(modal.schedule.id, {
          dayOfWeek: form.days[0] ?? modal.schedule.dayOfWeek,
          className: form.className || selectedPlan?.name || '',
          startTime: form.startTime,
          endTime: form.endTime,
          planId: form.planId,
          professorId: form.professorId,
          capacity: form.capacity ? Number(form.capacity) : null,
        });
        setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Clase actualizada');
      } else {
        const created = await Promise.all(
          form.days.map((day) =>
            academiesApi.createSchedule({
              dayOfWeek: day,
              className: form.className || selectedPlan?.name || '',
              startTime: form.startTime,
              endTime: form.endTime,
              planId: form.planId,
              professorId: form.professorId,
              capacity: form.capacity ? Number(form.capacity) : null,
            })
          )
        );
        setSchedules((prev) => [...prev, ...created]);
        toast.success(
          created.length === 1 ? 'Clase agregada' : `${created.length} clases agregadas`
        );
      }
      setModal(null);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Schedule) => {
    const ok = await confirm({
      message: `¿Quitar "${s.className}" del ${s.dayOfWeek}?`,
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    try {
      await academiesApi.deleteSchedule(s.id);
      setSchedules((prev) => prev.filter((x) => x.id !== s.id));
      toast.success('Clase eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Group plans by discipline for the selector
  const plansByDiscipline = plans.reduce<Record<string, Plan[]>>((acc, p) => {
    const key = p.disciplineName ?? 'Sin disciplina';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const isEdit = modal?.mode === 'edit';

  const startTour = useGuidedTour({
    storageKey: 'jjp_schedules_tour',
    welcomeTitle: '👋 Horarios de clases',
    welcomeBody: '<p>Aquí defines el horario de clases que se muestra en tu perfil público.</p>',
    loading,
    buildSteps: () => [
      {
        element: '[data-tour="agregar-clase"]',
        popover: { title: '➕ Agregar clase', description: 'Agrega una clase al horario: día(s), hora, nombre de la clase y profesor.', side: 'bottom', align: 'end' },
      },
      {
        element: '[data-tour="generar-imagen"]',
        popover: { title: '🖼️ Generar imagen', description: 'Crea un afiche con el horario para compartir en redes.', side: 'bottom', align: 'end' },
      },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Horarios de Clases</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Se muestran en tu perfil público
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startTour}
            title="Ayuda"
            aria-label="Ayuda"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm font-bold transition-colors"
          >
            ?
          </button>
          <button
            data-tour="generar-imagen"
            onClick={() => setShowPoster(true)}
            disabled={!academy}
            className="border border-gray-300 hover:border-primary-400 text-gray-600 hover:text-primary-600 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M6.75 6.75h.008v.008H6.75V6.75z" />
            </svg>
            Generar imagen
          </button>
          <button
            data-tour="agregar-clase"
            onClick={openAdd}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Agregar clase
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-2">
                <div className={`rounded-lg px-2 py-2 flex items-center justify-between gap-1 ${
                  byDay[day].length > 0 ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    byDay[day].length > 0 ? 'text-white' : 'text-gray-400'
                  }`}>
                    <span className="hidden sm:block">{day}</span>
                    <span className="sm:hidden">{DAY_SHORT[day]}</span>
                  </span>
                  {byDay[day].length > 0 && (
                    <span className="text-[10px] font-semibold bg-white/20 text-white rounded-full px-1.5 py-0.5 leading-none">
                      {byDay[day].length}
                    </span>
                  )}
                </div>

                {byDay[day].map((s) => {
                  const color = classColor(s.className);
                  return (
                    <div
                      key={s.id}
                      className="group rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all relative"
                      style={{ background: hexAlpha(color, 0.08), border: `1px solid ${hexAlpha(color, 0.25)}` }}
                      onClick={() => openEdit(s)}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: color }} />
                      <div className="pl-3.5 pr-7 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                          {s.className}
                        </p>
                        <p className="text-[11px] tabular-nums mt-0.5 font-medium" style={{ color }}>
                          {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                        </p>
                        {s.professorName && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            <span className="text-gray-600">Prof. </span>{s.professorName}
                          </p>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openRoster(s); }}
                          title="Ver reservas"
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-primary-600 rounded px-1.5 py-0.5 -ml-1 hover:bg-white/60 transition-colors"
                        >
                          <span aria-hidden>👥</span>
                          Reservas{s.capacity != null ? ` · cupo ${s.capacity}` : ''}
                        </button>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-bold shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    setForm({ ...emptyForm(), days: [day] });
                    setModal({ mode: 'add' });
                  }}
                  className="border border-dashed border-gray-300 hover:border-primary-400 text-gray-400 hover:text-primary-500 rounded-lg py-2 text-xs transition-colors"
                >
                  + Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-5">
              {isEdit ? 'Editar clase' : 'Agregar clase'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Plan / Clase *</label>
                <FormSelect
                  required
                  value={form.planId ?? ''}
                  onChange={(e) => handlePlanChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Seleccionar plan...</option>
                  {Object.entries(plansByDiscipline).map(([discipline, dPlans]) => (
                    <optgroup key={discipline} label={discipline}>
                      {dPlans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </FormSelect>
                {plans.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">No hay planes activos. Crea planes en "Planes y Tarifas".</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Nombre de la clase
                  <span className="text-gray-600 font-normal ml-1 normal-case">(se muestra en el horario)</span>
                </label>
                <FormInput
                  type="text"
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                  placeholder={selectedPlan?.name ?? 'Ej: NOGI, BJJ Kimono…'}
                />
              </div>

              {professors.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Profesor
                    <span className="text-gray-600 font-normal ml-1 normal-case">(sobreescribe el del plan)</span>
                  </label>
                  <FormSelect
                    value={form.professorId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, professorId: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">Usar profesor del plan</option>
                    {professors.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.belt ? ` · ${p.belt}` : ''}</option>
                    ))}
                  </FormSelect>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {isEdit ? 'Día' : 'Días'}
                  {!isEdit && <span className="text-gray-600 font-normal ml-1 normal-case">(puedes seleccionar varios)</span>}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const active = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          active
                            ? 'bg-primary-600 border-primary-500 text-white shadow-md shadow-primary-500/20'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Inicio</label>
                  <FormInput required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Fin</label>
                  <FormInput required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Cupo
                  <span className="text-gray-600 font-normal ml-1 normal-case">(opcional — vacío = sin límite)</span>
                </label>
                <FormInput
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="Sin límite"
                />
                <p className="text-xs text-gray-500 mt-1">Si pones un cupo, los alumnos podrán reservar su lugar desde la app.</p>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPoster && academy && (
        <SchedulePosterModal
          schedules={schedules}
          academy={academy}
          onClose={() => setShowPoster(false)}
        />
      )}

      {/* Roster: who reserved a class occurrence */}
      {roster && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setRoster(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{roster.schedule.className}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {roster.schedule.dayOfWeek} · {roster.schedule.startTime.slice(0, 5)}–{roster.schedule.endTime.slice(0, 5)}
                    {roster.schedule.professorName ? ` · Prof. ${roster.schedule.professorName}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setRoster(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              {/* Date selector: upcoming occurrences of this weekday */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {roster.dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => setRoster((r) => (r ? { ...r, date: d } : r))}
                    className={`text-xs px-2.5 py-1 rounded-full border capitalize transition-colors ${
                      d === roster.date
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {fmtOccurrence(d)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {roster.loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-gray-900">{roster.list?.length ?? 0}</span>
                    <span className="text-sm text-gray-500">
                      {(roster.list?.length ?? 0) === 1 ? 'alumno reservado' : 'alumnos reservados'}
                      {roster.schedule.capacity != null && ` de ${roster.schedule.capacity} cupos`}
                    </span>
                  </div>

                  {!roster.list || roster.list.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Nadie ha reservado esta clase aún.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {roster.list.map((p) => (
                        <li key={p.studentId} className="flex items-center gap-3">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100" />
                          ) : (
                            <span className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center">
                              {initials(p.name)}
                            </span>
                          )}
                          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                          {p.belt && (
                            <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${BELT_CHIP[p.belt] ?? 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                              {p.belt}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
