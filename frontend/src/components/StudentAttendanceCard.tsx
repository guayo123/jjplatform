import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode } from '@phosphor-icons/react';
import { attendanceApi } from '../api/attendance';
import type { AttendanceHistory } from '../types';

function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Admin student detail: attendance this month / last 30 days and the latest check-ins. */
export default function StudentAttendanceCard({ studentId }: { studentId: number }) {
  const [data, setData] = useState<AttendanceHistory | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    attendanceApi.history(studentId).then(setData).catch(() => setData(null));
  }, [studentId]);

  if (!data) return null;
  const items = showAll ? data.items : data.items.slice(0, 8);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><QrCode /> Asistencia</h2>
        <Link to="/admin/attendance" className="text-xs text-primary-600 font-medium">Ver por día</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-2xl font-bold text-gray-900">{data.thisMonth}</p>
          <p className="text-xs text-gray-500">clases este mes</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-2xl font-bold text-gray-900">{data.last30}</p>
          <p className="text-xs text-gray-500">últimos 30 días</p>
        </div>
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no registra asistencia.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-50">
            {items.map((a) => (
              <li key={a.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="w-28 text-gray-500 capitalize">{shortDate(a.date)}</span>
                <span className="flex-1 text-gray-900 truncate">{a.className ?? 'Entrenamiento libre'}</span>
                {a.source === 'MANUAL' && <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Manual</span>}
                <span className="text-xs text-gray-400">{a.checkedInAt.slice(11, 16)}</span>
              </li>
            ))}
          </ul>
          {data.items.length > 8 && (
            <button onClick={() => setShowAll((v) => !v)} className="text-xs text-primary-600 font-medium mt-2">
              {showAll ? 'Ver menos' : `Ver las ${data.items.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
