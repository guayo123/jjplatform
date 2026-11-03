import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, NotePencil, QrCode, WarningCircle } from '@phosphor-icons/react';
import { checkinApi } from '../../api/attendance';
import type { Attendance, CheckinInfo } from '../../types';

const FREE = 0; // pseudo schedule id for "entrenamiento libre" (no class running)

// The API client already turns failures into Error(server message).
function errorText(e: unknown, fallback: string) {
  return (e instanceof Error && e.message) || fallback;
}

/**
 * Page the printed academy QR opens (/asistencia/:code). Marks the logged-in student — or the kids of a
 * guardian — present in the class running now, or in a free session when none is, then offers to log
 * the session in the training journal.
 */
export default function Checkin() {
  const { code = '' } = useParams();
  const [info, setInfo] = useState<CheckinInfo | null>(null);
  const [error, setError] = useState('');
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Attendance[] | null>(null);
  const [journal, setJournal] = useState<'ask' | 'saving' | 'done' | 'skipped'>('ask');
  const [journalCreated, setJournalCreated] = useState(0);
  const autoSent = useRef(false);

  useEffect(() => {
    checkinApi.info(code)
      .then((data) => {
        setInfo(data);
        const target = data.classes.length === 1 ? data.classes[0].scheduleId : data.classes.length === 0 ? FREE : null;
        setScheduleId(target);
        // Preselect whoever isn't marked yet for that class (own record first if it's among them).
        const pending = data.profiles.filter((p) => target == null || !p.checkedIn.includes(target));
        const own = pending.find((p) => p.self);
        setSelected(new Set(own && data.profiles.length > 1 ? [own.studentId] : pending.map((p) => p.studentId)));
      })
      .catch((e) => setError(errorText(e, 'No pudimos leer este código QR.')));
  }, [code]);

  const submit = async (ids: number[], target: number) => {
    setBusy(true);
    setError('');
    try {
      setResult(await checkinApi.checkin(code, ids, target === FREE ? null : target));
    } catch (e) {
      setError(errorText(e, 'No se pudo registrar la asistencia. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  };

  // The common case — one person, one (or no) class — needs no taps: scanning is enough.
  useEffect(() => {
    // With several classes the pick must be confirmed, so a mistaken tap doesn't mark the wrong one.
    if (!info || autoSent.current || info.profiles.length !== 1 || info.classes.length > 1 || scheduleId == null) return;
    autoSent.current = true;
    void submit([info.profiles[0].studentId], scheduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, scheduleId]);

  const logJournal = async () => {
    if (!result) return;
    setJournal('saving');
    try {
      setJournalCreated(await checkinApi.logToJournal(result.map((a) => a.id)));
      setJournal('done');
    } catch {
      setJournal('ask');
      setError('No se pudo guardar en tu diario. Puedes registrarlo desde la pestaña Entreno.');
    }
  };

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const className = (id: number | null) =>
    id === FREE || id == null ? 'Entrenamiento libre' : info?.classes.find((c) => c.scheduleId === id)?.className ?? 'Clase';

  return (
    <div className="portal-theme min-h-screen flex items-center justify-center px-4 py-8 pt-safe">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-6 text-center">
          {info?.academyLogoUrl ? (
            <img src={info.academyLogoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-lg mb-3" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg mb-3"
                 style={{ background: 'var(--gradient-acc)' }}>
              <QrCode weight="bold" />
            </div>
          )}
          <h1 className="jjp-display text-2xl font-extrabold tracking-tight">Asistencia</h1>
          {info && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{info.academyName}</p>}
        </div>

        <div className="rounded-2xl p-6 shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          {error && (
            <div className="flex gap-2 items-start bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              <WarningCircle size="1.2em" className="flex-shrink-0 mt-0.5" aria-hidden /> {error}
            </div>
          )}

          {!info && !error && <p className="text-center text-sm py-6" style={{ color: 'var(--muted)' }}>Cargando…</p>}

          {info && !result && (
            <div className="space-y-5">
              {info.classes.length > 1 && (
                <fieldset>
                  <legend className="text-sm font-semibold mb-2">¿A qué clase llegaste?</legend>
                  <div className="space-y-2">
                    {info.classes.map((c) => (
                      <label key={c.scheduleId}
                             className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                             style={{ border: `1px solid ${scheduleId === c.scheduleId ? 'var(--acc)' : 'var(--line)'}` }}>
                        <input type="radio" name="clase" checked={scheduleId === c.scheduleId}
                               onChange={() => setScheduleId(c.scheduleId)} />
                        <span className="flex-1">
                          <span className="block font-medium">{c.className}</span>
                          <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                            {c.startTime.slice(0, 5)}–{c.endTime.slice(0, 5)}{c.professorName ? ` · ${c.professorName}` : ''}
                          </span>
                        </span>
                        {info.profiles.length === 1 && info.profiles[0].checkedIn.includes(c.scheduleId) && (
                          <span className="text-xs text-green-500 font-medium">Ya registrada</span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {info.classes.length === 1 && (
                <p className="text-sm">
                  Clase: <strong>{info.classes[0].className}</strong>{' '}
                  <span style={{ color: 'var(--muted)' }}>
                    {info.classes[0].startTime.slice(0, 5)}–{info.classes[0].endTime.slice(0, 5)}
                  </span>
                </p>
              )}
              {info.classes.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No hay una clase en este momento: quedará como <strong style={{ color: 'var(--text)' }}>entrenamiento libre</strong>.
                </p>
              )}

              {info.profiles.length > 1 && (
                <fieldset>
                  <legend className="text-sm font-semibold mb-2">¿Quiénes llegaron?</legend>
                  <div className="space-y-2">
                    {info.profiles.map((p) => {
                      const already = scheduleId != null && p.checkedIn.includes(scheduleId);
                      return (
                        <label key={p.studentId}
                               className={`flex items-center gap-3 p-3 rounded-xl ${already ? 'opacity-60' : 'cursor-pointer'}`}
                               style={{ border: '1px solid var(--line)' }}>
                          <input type="checkbox" disabled={already}
                                 checked={already || selected.has(p.studentId)}
                                 onChange={() => toggle(p.studentId)} />
                          <span className="flex-1 font-medium">{p.name}{p.self ? ' (tú)' : ''}</span>
                          {already && <span className="text-xs" style={{ color: 'var(--muted)' }}>Ya marcado</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {(info.profiles.length > 1 || info.classes.length > 1) && (
                <button
                  type="button"
                  disabled={busy || scheduleId == null || selected.size === 0}
                  onClick={() => scheduleId != null && submit([...selected], scheduleId)}
                  className="w-full text-white font-semibold py-3 rounded-xl disabled:opacity-50"
                  style={{ background: 'var(--gradient-acc)' }}
                >
                  {busy ? 'Registrando…' : 'Marcar asistencia'}
                </button>
              )}
              {info.profiles.length === 1 && info.classes.length <= 1 && busy && (
                <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>Registrando…</p>
              )}
            </div>
          )}

          {result && (
            <div className="text-center space-y-4">
              <CheckCircle size={56} weight="fill" className="mx-auto text-green-500" aria-hidden />
              <div>
                <p className="text-lg font-bold">
                  {result.every((a) => a.created === false) ? 'Ya estabas registrado' : '¡Asistencia registrada!'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {className(result[0]?.scheduleId ?? FREE)}
                  {result[0]?.startTime ? ` · ${result[0].startTime.slice(0, 5)}` : ''}
                </p>
                {result.length > 1 && (
                  <p className="text-sm mt-1">{result.map((a) => a.studentName.split(' ')[0]).join(', ')}</p>
                )}
              </div>

              {journal === 'ask' && (
                <div className="rounded-xl p-4 text-left" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <NotePencil aria-hidden /> ¿Quieres registrar este entreno en tu diario?
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Suma a tu racha. Después puedes agregar técnicas, rounds y compañeros.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={logJournal}
                            className="flex-1 text-white font-semibold py-2 rounded-lg" style={{ background: 'var(--gradient-acc)' }}>
                      Sí, registrar
                    </button>
                    <button type="button" onClick={() => setJournal('skipped')}
                            className="flex-1 font-semibold py-2 rounded-lg" style={{ border: '1px solid var(--line)' }}>
                      No, gracias
                    </button>
                  </div>
                </div>
              )}
              {journal === 'saving' && <p className="text-sm" style={{ color: 'var(--muted)' }}>Guardando en tu diario…</p>}
              {journal === 'done' && (
                <p className="text-sm">
                  {journalCreated > 0 ? 'Listo, quedó en tu diario. ¡Racha al día!' : 'Ya tenías un entreno registrado hoy.'}
                </p>
              )}

              <Link to="/portal" className="block text-sm font-semibold" style={{ color: 'var(--acc)' }}>
                Ir a mi portal
              </Link>
            </div>
          )}

          {!info && error && (
            <Link to="/portal" className="block text-center text-sm font-semibold mt-2" style={{ color: 'var(--acc)' }}>
              Ir a mi portal
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
