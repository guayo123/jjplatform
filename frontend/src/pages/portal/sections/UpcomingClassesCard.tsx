import { useEffect, useState } from 'react';
import type { UpcomingClass } from '../../../types';
import { portalApi } from '../../../api/portal';
import { tapLight, notifySuccess } from '../../../native/haptics';
import { scheduleClassReminder, cancelClassReminder } from '../../../native/notifications';
import { CardSkeleton } from './shared';

/** "Próximas clases" — reserve a spot in upcoming classes; sets a local reminder ~2h before. */
export default function UpcomingClassesCard({ studentId }: { studentId: number }) {
  const [classes, setClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState('');

  useEffect(() => {
    portalApi.upcomingClasses(studentId).then(setClasses).catch(() => setClasses([])).finally(() => setLoading(false));
  }, [studentId]);

  const key = (c: UpcomingClass) => `${c.scheduleId}-${c.classDate}`;

  const toggle = async (c: UpcomingClass) => {
    void tapLight();
    setBusy(key(c));
    const willReserve = !c.mineReserved;
    try {
      if (willReserve) {
        await portalApi.reserveClass(studentId, c.scheduleId, c.classDate);
        void scheduleClassReminder(c.scheduleId, c.classDate, c.startTime, c.className);
        void notifySuccess();
      } else {
        await portalApi.cancelClass(studentId, c.scheduleId, c.classDate);
        void cancelClassReminder(c.scheduleId, c.classDate);
      }
      setClasses((prev) => prev.map((x) => {
        if (key(x) !== key(c)) return x;
        const reservedCount = x.reservedCount + (willReserve ? 1 : -1);
        const spotsLeft = x.capacity == null ? null : Math.max(0, x.capacity - reservedCount);
        return { ...x, mineReserved: willReserve, reservedCount, spotsLeft };
      }));
    } catch {
      // Reload to reflect the real state (e.g. class filled up meanwhile).
      portalApi.upcomingClasses(studentId).then(setClasses).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <CardSkeleton lines={2} />;
  }
  if (classes.length === 0) return null;

  // Group by date so a horizontal day-selector keeps the list short (one day at a time).
  const groups: { date: string; items: UpcomingClass[] }[] = [];
  for (const c of classes) {
    const g = groups.find((x) => x.date === c.classDate);
    if (g) g.items.push(c); else groups.push({ date: c.classDate, items: [c] });
  }
  const selectedDate = groups.find((g) => g.date === activeDate)?.date ?? groups[0]?.date;
  const selectedItems = groups.find((g) => g.date === selectedDate)?.items ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-5 pb-3 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Próximas clases</h2>
        <p className="text-xs text-gray-400 mt-0.5">Reserva tu cupo y te avisamos antes de la clase</p>
      </div>

      {/* Day selector — horizontal calendar chips */}
      <div className="flex gap-2 overflow-x-auto px-5 pt-3 pb-1">
        {groups.map((g) => {
          const on = g.date === selectedDate;
          const mine = g.items.some((c) => c.mineReserved);
          return (
            <button
              key={g.date}
              onClick={() => { void tapLight(); setActiveDate(g.date); }}
              className={`flex-shrink-0 w-14 py-2 rounded-2xl border flex flex-col items-center transition-colors ${
                on ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${on ? 'text-white/90' : 'text-gray-400'}`}>{dayChipTop(g.date)}</span>
              <span className="text-lg font-extrabold leading-none mt-0.5">{dayChipNum(g.date)}</span>
              <span
                className={`mt-1 w-1.5 h-1.5 rounded-full ${mine ? (on ? 'bg-white' : 'bg-green-500') : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>

      {/* Classes for the selected day */}
      <div className="p-5 pt-3 space-y-2">
        {selectedItems.map((c) => {
          const full = c.spotsLeft === 0 && !c.mineReserved;
          return (
            <div key={key(c)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
              <div className="text-center flex-shrink-0 w-12">
                <p className="text-sm font-bold text-gray-900">{c.startTime}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.className}</p>
                <p className="text-xs text-gray-400">
                  {c.professorName ? `${c.professorName} · ` : ''}
                  {c.capacity == null ? 'Cupos disponibles' : `${c.reservedCount}/${c.capacity} reservados`}
                </p>
              </div>
              <button
                onClick={() => toggle(c)}
                disabled={busy === key(c) || full}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                  c.mineReserved
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                    : full
                      ? 'border-gray-200 text-gray-400'
                      : 'border-primary-300 text-primary-700 hover:bg-primary-50'
                }`}
              >
                {busy === key(c) ? '…' : c.mineReserved ? '✓ Reservado' : full ? 'Llena' : 'Reservar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day-chip labels: "Hoy" / weekday abbrev + day number.
function chipDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}
function dayChipTop(iso: string): string {
  const d = chipDate(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  return d.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
}
function dayChipNum(iso: string): string {
  return String(chipDate(iso).getDate());
}
