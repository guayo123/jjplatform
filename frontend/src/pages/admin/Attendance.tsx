import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowsClockwise, CaretLeft, CaretRight, DownloadSimple, QrCode, X } from '@phosphor-icons/react';
import { attendanceApi, checkinUrl } from '../../api/attendance';
import { studentsApi } from '../../api/students';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import { useAuthStore } from '../../stores/authStore';
import { textIncludes } from '../../utils/text';
import type { Attendance as AttendanceRow, AttendanceDay, Student } from '../../types';

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function shiftDate(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

/** Printable A4 poster (PNG) with the academy QR and how to use it. */
async function downloadPoster(url: string, academyName: string) {
  const W = 1240, H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(academyName, W / 2, 170);
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.fillText('Marca tu asistencia', W / 2, 310);

  const qr = new Image();
  qr.src = await QRCode.toDataURL(url, { width: 900, margin: 1 });
  await new Promise((r) => { qr.onload = r; });
  ctx.drawImage(qr, (W - 900) / 2, 380, 900, 900);

  ctx.font = '44px system-ui, sans-serif';
  ctx.fillStyle = '#374151';
  ['1. Abre la cámara de tu celular', '2. Apunta a este código y toca el enlace', '3. Si te lo pide, inicia sesión en tu portal']
    .forEach((line, i) => ctx.fillText(line, W / 2, 1390 + i * 70));
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(url, W / 2, H - 70);

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'qr-asistencia.png';
  a.click();
}

/**
 * Staff view of QR attendance: the academy QR (print / replace) and, per day, who came to each class,
 * who reserved and didn't come, free sessions, plus manual marks for students without a phone.
 */
export default function Attendance() {
  const academyName = useAuthStore((s) => s.academyName) ?? 'Mi academia';
  const { toast } = useToast();
  const confirm = useConfirm();
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [day, setDay] = useState<AttendanceDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  // Manual mark picker: which class (null = free session) it's open for.
  const [picker, setPicker] = useState<{ scheduleId: number | null; label: string } | null>(null);

  useEffect(() => {
    attendanceApi.code().then(setCode).catch(() => toast.error('No se pudo obtener el código QR'));
    studentsApi.list().then((list) => setStudents(list.filter((s) => s.active !== false))).catch(() => undefined);
  }, [toast]);

  useEffect(() => {
    if (!code) return;
    QRCode.toDataURL(checkinUrl(code), { width: 320, margin: 1 }).then(setQr);
  }, [code]);

  const load = useCallback(() => {
    setLoading(true);
    attendanceApi.day(date).then(setDay).catch(() => toast.error('No se pudo cargar la asistencia')).finally(() => setLoading(false));
  }, [date, toast]);

  useEffect(() => { load(); }, [load]);

  const today = toISODate(new Date());
  const total = day ? day.classes.reduce((n, c) => n + c.attendees.length, 0) + day.free.length : 0;

  const regenerate = async () => {
    const ok = await confirm({
      title: 'Cambiar QR',
      message: 'El QR impreso actual dejará de funcionar y tendrás que imprimir el nuevo. ¿Continuar?',
      confirmLabel: 'Cambiar QR',
      danger: true,
    });
    if (!ok) return;
    try {
      setCode(await attendanceApi.regenerateCode());
      toast.success('QR cambiado. Imprime el nuevo afiche.');
    } catch {
      toast.error('No se pudo cambiar el QR');
    }
  };

  const mark = async (studentId: number, scheduleId: number | null) => {
    try {
      await attendanceApi.mark(studentId, scheduleId, date);
      load();
      return true;
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo marcar');
      return false;
    }
  };

  const remove = async (a: AttendanceRow) => {
    const ok = await confirm({ message: `¿Quitar la asistencia de ${a.studentName}?`, confirmLabel: 'Quitar', danger: true });
    if (!ok) return;
    try {
      await attendanceApi.remove(a.id);
      load();
    } catch {
      toast.error('No se pudo quitar');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Asistencia</h1>
        <p className="text-sm text-gray-500 mt-0.5">Los alumnos escanean el QR del dojo al llegar. También puedes marcarlos a mano.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* QR */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <h2 className="font-semibold text-gray-900 flex items-center justify-center gap-2"><QrCode /> QR de asistencia</h2>
          {qr ? (
            <img src={qr} alt="Código QR de asistencia" className="w-48 h-48 mx-auto my-4" />
          ) : (
            <div className="w-48 h-48 mx-auto my-4 bg-gray-100 rounded animate-pulse" />
          )}
          <p className="text-xs text-gray-500 mb-4">Imprímelo y pégalo en la entrada. Sirve para todas las clases.</p>
          <div className="space-y-2">
            <button
              onClick={() => code && downloadPoster(checkinUrl(code), academyName)}
              disabled={!code}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              <DownloadSimple /> Descargar afiche
            </button>
            <button
              onClick={regenerate}
              disabled={!code}
              className="w-full border border-gray-300 hover:border-red-300 text-gray-600 hover:text-red-600 disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              <ArrowsClockwise /> Cambiar QR
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Si una foto del QR circula por WhatsApp, cámbialo: el anterior deja de funcionar.</p>
        </div>

        {/* Day */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Día anterior"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
              <CaretLeft />
            </button>
            <div className="flex-1 text-center">
              <p className="font-semibold capitalize">{longDate(date)}</p>
              <p className="text-xs text-gray-500">{total} asistencia{total !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setDate((d) => shiftDate(d, 1))} disabled={date >= today} aria-label="Día siguiente"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30">
              <CaretRight />
            </button>
            {date !== today && (
              <button onClick={() => setDate(today)} className="text-sm text-primary-600 font-medium px-2">Hoy</button>
            )}
          </div>

          {loading && !day ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : day && (
            <div className="space-y-4">
              {day.classes.length === 0 && day.free.length === 0 && (
                <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">
                  No hay clases en el horario para este día.
                </p>
              )}

              {day.classes.map((c) => {
                const ended = date < today || (date === today && hhmm(c.endTime) <= new Date().toTimeString().slice(0, 5));
                return (
                  <div key={c.scheduleId} className="bg-white rounded-xl border border-gray-200">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.className}</p>
                        <p className="text-xs text-gray-500">
                          {hhmm(c.startTime)}–{hhmm(c.endTime)}{c.professorName ? ` · ${c.professorName}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {c.attendees.length}{c.capacity ? `/${c.capacity}` : ''}
                      </span>
                      <button onClick={() => setPicker({ scheduleId: c.scheduleId, label: c.className })}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        + Marcar
                      </button>
                    </div>
                    <AttendeeList rows={c.attendees} onRemove={remove} />
                    {c.noShows.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-amber-700 mb-2">
                          {ended ? 'Reservaron y no vinieron' : 'Reservaron, aún no llegan'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {c.noShows.map((n) => (
                            <button key={n.studentId} onClick={() => mark(n.studentId, c.scheduleId)}
                                    title="Marcar como presente"
                                    className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100">
                              {n.name} <span className="text-amber-600">+ presente</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Entrenamiento libre</p>
                    <p className="text-xs text-gray-500">Llegaron cuando no había clase (open mat)</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{day.free.length}</span>
                  <button onClick={() => setPicker({ scheduleId: null, label: 'Entrenamiento libre' })}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                    + Marcar
                  </button>
                </div>
                <AttendeeList rows={day.free} onRemove={remove} />
              </div>
            </div>
          )}
        </div>
      </div>

      {picker && (
        <MarkPicker
          title={picker.label}
          students={students}
          taken={new Set(
            (picker.scheduleId == null ? day?.free : day?.classes.find((c) => c.scheduleId === picker.scheduleId)?.attendees)
              ?.map((a) => a.studentId) ?? [],
          )}
          onPick={(id) => mark(id, picker.scheduleId)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function AttendeeList({ rows, onRemove }: { rows: AttendanceRow[]; onRemove: (a: AttendanceRow) => void }) {
  if (rows.length === 0) return <p className="px-5 py-3 text-sm text-gray-400">Nadie todavía.</p>;
  return (
    <ul className="divide-y divide-gray-50">
      {rows.map((a) => (
        <li key={a.id} className="px-5 py-2.5 flex items-center gap-3">
          {a.photoUrl ? (
            <img src={a.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
              {a.studentName.charAt(0)}
            </div>
          )}
          <span className="flex-1 text-sm text-gray-900 truncate">{a.studentName}</span>
          {a.source === 'MANUAL' && <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Manual</span>}
          <span className="text-xs text-gray-400">{a.checkedInAt.slice(11, 16)}</span>
          <button onClick={() => onRemove(a)} aria-label={`Quitar a ${a.studentName}`}
                  className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
            <X />
          </button>
        </li>
      ))}
    </ul>
  );
}

function MarkPicker({ title, students, taken, onPick, onClose }: {
  title: string;
  students: Student[];
  taken: Set<number>;
  onPick: (studentId: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const list = useMemo(() => {
    const q = query.trim();
    return (q ? students.filter((s) => textIncludes(s.name, q)) : students).slice(0, 60);
  }, [students, query]);

  const pick = async (id: number) => {
    setBusy(id);
    if (await onPick(id)) setDone((d) => new Set(d).add(id));
    setBusy(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold">Marcar asistencia</p>
            <p className="text-xs text-gray-500">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100"><X /></button>
        </div>
        <div className="px-5 py-3">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar alumno…"
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <ul className="overflow-y-auto divide-y divide-gray-50 pb-3">
          {list.map((s) => {
            const marked = taken.has(s.id) || done.has(s.id);
            return (
              <li key={s.id} className="px-5 py-2 flex items-center gap-3">
                <span className="flex-1 text-sm truncate">{s.name}</span>
                {marked ? (
                  <span className="text-xs text-green-600 font-medium">Presente</span>
                ) : (
                  <button onClick={() => pick(s.id)} disabled={busy === s.id}
                          className="text-xs font-medium px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50">
                    {busy === s.id ? '…' : 'Marcar'}
                  </button>
                )}
              </li>
            );
          })}
          {list.length === 0 && <li className="px-5 py-4 text-sm text-gray-400">Sin resultados.</li>}
        </ul>
      </div>
    </div>
  );
}
