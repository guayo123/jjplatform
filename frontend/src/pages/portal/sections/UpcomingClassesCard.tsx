import { useEffect, useState } from 'react';
import type { UpcomingClass } from '../../../types';
import { portalApi } from '../../../api/portal';
import { tapLight, notifySuccess } from '../../../native/haptics';
import { scheduleClassReminder, cancelClassReminder } from '../../../native/notifications';
import { formatDate, Spinner } from './shared';

/** "Próximas clases" — reserve a spot in upcoming classes; sets a local reminder ~2h before. */
export default function UpcomingClassesCard({ studentId }: { studentId: number }) {
  const [classes, setClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
    return (
      <div className="bg-white rounded-xl shadow-sm p-5"><Spinner /></div>
    );
  }
  if (classes.length === 0) return null;

  // Group by date for friendly day headers.
  const groups: { date: string; items: UpcomingClass[] }[] = [];
  for (const c of classes) {
    const g = groups.find((x) => x.date === c.classDate);
    if (g) g.items.push(c); else groups.push({ date: c.classDate, items: [c] });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Próximas clases</h2>
        <p className="text-xs text-gray-400 mt-0.5">Reserva tu cupo y te avisamos antes de la clase</p>
      </div>
      <div className="p-5 space-y-4">
        {groups.map((g) => (
          <div key={g.date}>
            <p className="text-xs font-semibold text-gray-500 mb-2 capitalize">{formatDate(g.date)}</p>
            <div className="space-y-2">
              {g.items.map((c) => {
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
        ))}
      </div>
    </div>
  );
}
