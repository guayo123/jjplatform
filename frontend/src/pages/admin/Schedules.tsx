import { useEffect, useState } from 'react';
import { academiesApi } from '../../api/academies';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import SchedulePosterModal from './SchedulePosterModal';
import type { Schedule, ScheduleForm, AcademySettings } from '../../types';

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

const emptyForm = (): ScheduleForm & { days: string[] } => ({
  days: [],
  dayOfWeek: '',
  className: '',
  startTime: '18:00',
  endTime: '19:30',
});

type ModalState =
  | { mode: 'add' }
  | { mode: 'edit'; schedule: Schedule };

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [academy, setAcademy] = useState<AcademySettings | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  const load = () =>
    academiesApi.getSchedules().then(setSchedules).finally(() => setLoading(false));

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
      className: s.className,
      startTime: s.startTime.slice(0, 5),
      endTime: s.endTime.slice(0, 5),
    });
    setModal({ mode: 'edit', schedule: s });
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.mode === 'add' && form.days.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        const updated = await academiesApi.updateSchedule(modal.schedule.id, {
          dayOfWeek: form.days[0] ?? modal.schedule.dayOfWeek,
          className: form.className,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Clase actualizada');
      } else {
        // Create one entry per selected day
        const created = await Promise.all(
          form.days.map((day) =>
            academiesApi.createSchedule({
              dayOfWeek: day,
              className: form.className,
              startTime: form.startTime,
              endTime: form.endTime,
            })
          )
        );
        setSchedules((prev) => [...prev, ...created]);
        toast.success(
          created.length === 1
            ? 'Clase agregada'
            : `${created.length} clases agregadas`
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

  const isEdit = modal?.mode === 'edit';

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
        /* Weekly grid — horizontal scroll on mobile */
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-2">
                {/* Day header */}
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

                {/* Class cards */}
                {byDay[day].map((s) => {
                  const color = classColor(s.className);
                  return (
                    <div
                      key={s.id}
                      className="group rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all relative"
                      style={{ background: hexAlpha(color, 0.08), border: `1px solid ${hexAlpha(color, 0.25)}` }}
                      onClick={() => openEdit(s)}
                    >
                      {/* Left accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: color }} />
                      <div className="pl-3.5 pr-7 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                          {s.className}
                        </p>
                        <p className="text-[11px] tabular-nums mt-0.5 font-medium" style={{ color }}>
                          {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                        </p>
                      </div>
                      {/* Delete btn */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-bold shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {/* Add shortcut */}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-5">
              {isEdit ? 'Editar clase' : 'Agregar clase'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la clase
                </label>
                <input
                  required
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value })}
                  placeholder="ej: BJJ Fundamentales, Grappling Avanzado…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Días */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEdit ? 'Día' : 'Días'}
                  {!isEdit && (
                    <span className="text-xs font-normal text-gray-400 ml-1">(puedes seleccionar varios)</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const active = form.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inicio
                  </label>
                  <input
                    required
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fin
                  </label>
                  <input
                    required
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors"
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
    </div>
  );
}
