import type { TrainingSession } from '../../../types';

// ── date helpers ──────────────────────────────────────────────────────────
function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Monday of the week containing d. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  const back = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Data-viz for the training journal — hours/week, attendance heatmap and a
 * submissions map (logradas vs recibidas). All computed client-side from the
 * student's own sessions; colors come from the theme tokens.
 */
export default function TrainingCharts({ sessions }: { sessions: TrainingSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <>
      <HoursPerWeek sessions={sessions} />
      <AttendanceHeatmap sessions={sessions} />
      <SubmissionsMap sessions={sessions} />
    </>
  );
}

// ── Hours per week ────────────────────────────────────────────────────────
function HoursPerWeek({ sessions }: { sessions: TrainingSession[] }) {
  const WEEKS = 6;
  const cur = weekStart(new Date());
  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(cur);
    start.setDate(start.getDate() - (WEEKS - 1 - i) * 7);
    return { start, minutes: 0 };
  });
  for (const s of sessions) {
    const ws = weekStart(parse(s.date)).getTime();
    const b = buckets.find((x) => x.start.getTime() === ws);
    if (b) b.minutes += s.durationMin ?? 0;
  }
  const maxMin = Math.max(60, ...buckets.map((b) => b.minutes));
  const totalH = Math.round((buckets.reduce((a, b) => a + b.minutes, 0) / 60) * 10) / 10;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold text-gray-900">Horas por semana</h2>
        <span className="text-xs text-gray-400">{totalH} h en 6 semanas</span>
      </div>
      <div className="mt-4 flex items-end gap-2.5" style={{ height: 96 }}>
        {buckets.map((b, i) => {
          const h = Math.round((b.minutes / maxMin) * 100);
          const isCur = i === buckets.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
              <span className="text-[10px] font-semibold" style={{ color: b.minutes ? 'var(--acc,#FF5436)' : 'transparent' }}>
                {b.minutes ? `${Math.round((b.minutes / 60) * 10) / 10}h` : ''}
              </span>
              <div
                className="w-full rounded-t-md rounded-b-sm"
                style={{
                  height: `${Math.max(b.minutes ? 6 : 2, h)}%`,
                  background: b.minutes
                    ? (isCur ? 'var(--gradient-acc, linear-gradient(#FF4133,#FF8A1E))' : 'var(--surface-2,#e5e7eb)')
                    : 'var(--surface-2,#eee)',
                  boxShadow: isCur && b.minutes ? '0 0 14px -3px var(--acc-1,#FF4133)' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2.5">
        {buckets.map((b, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-gray-400 font-semibold tabular-nums">
            {b.start.getDate()}/{b.start.getMonth() + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Attendance heatmap (GitHub-style) ─────────────────────────────────────
const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function AttendanceHeatmap({ sessions }: { sessions: TrainingSession[] }) {
  const WEEKS = 10;
  const counts = new Map<string, number>();
  for (const s of sessions) counts.set(s.date, (counts.get(s.date) ?? 0) + 1);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startMon = weekStart(new Date());
  // Each week is a column of 7 day-cells (Mon→Sun).
  const columns: { key: string; count: number; future: boolean }[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const colStart = new Date(startMon);
    colStart.setDate(colStart.getDate() - w * 7);
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(colStart);
      day.setDate(day.getDate() + d);
      col.push({ key: ymd(day), count: counts.get(ymd(day)) ?? 0, future: day > today });
    }
    columns.push(col);
  }
  const op = [0, 0.45, 0.72, 1];
  const level = (c: number) => (c <= 0 ? 0 : c >= 3 ? 3 : c);
  const limit = new Date(startMon);
  limit.setDate(limit.getDate() - (WEEKS - 1) * 7);
  const trainedDays = [...counts.keys()].filter((k) => parse(k) >= limit).length;
  const cellStyle = (c: { count: number; future: boolean }) => ({
    aspectRatio: '1 / 1',
    background: c.future ? 'transparent' : c.count > 0 ? 'var(--acc,#FF5436)' : 'var(--surface-2,#eef1f6)',
    opacity: c.future ? 0 : c.count > 0 ? op[level(c.count)] : 1,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold text-gray-900">Asistencia</h2>
        <span className="text-xs text-gray-400">{trainedDays} días en 10 semanas</span>
      </div>
      <div className="mt-4 flex gap-2 items-stretch">
        <div className="flex flex-col">
          {DOW.map((d, i) => (
            <span key={i} className="text-[8px] text-gray-400 leading-none flex-1 flex items-center">{d}</span>
          ))}
        </div>
        <div className="flex gap-[3px] flex-1">
          {columns.map((col, ci) => (
            <div key={ci} className="flex-1 flex flex-col gap-[3px]">
              {col.map((c, di) => (
                <div key={di} title={`${c.key}: ${c.count} ${c.count === 1 ? 'entreno' : 'entrenos'}`}
                  className="rounded-[3px]" style={cellStyle(c)} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-[9px] text-gray-400">menos</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className="w-2.5 h-2.5 rounded-[3px]"
            style={{ background: l === 0 ? 'var(--surface-2,#eef1f6)' : 'var(--acc,#FF5436)', opacity: l === 0 ? 1 : op[l] }} />
        ))}
        <span className="text-[9px] text-gray-400">más</span>
      </div>
    </div>
  );
}

// ── Submissions map (logradas vs recibidas) ───────────────────────────────
function SubmissionsMap({ sessions }: { sessions: TrainingSession[] }) {
  const map = new Map<string, { l: number; r: number }>();
  for (const s of sessions) {
    for (const sub of s.submissions) {
      const e = map.get(sub.name) ?? { l: 0, r: 0 };
      if (sub.direction === 'LOGRADA') e.l += 1; else e.r += 1;
      map.set(sub.name, e);
    }
  }
  const rows = [...map.entries()]
    .map(([name, v]) => ({ name, ...v, total: v.l + v.r }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  if (rows.length === 0) return null;

  const totalL = rows.reduce((a, r) => a + r.l, 0);
  const totalR = rows.reduce((a, r) => a + r.r, 0);
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const GREEN = 'var(--c-green,#34D399)';
  const RED = '#EF4444';

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold text-gray-900">Sumisiones</h2>
        <span className="text-xs text-gray-400">
          <span style={{ color: GREEN }}>{totalL} logradas</span> · <span style={{ color: RED }}>{totalR} recibidas</span>
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24 flex-shrink-0 truncate">{r.name}</span>
            <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2,#eef1f6)' }}>
              <div style={{ width: `${(r.l / maxTotal) * 100}%`, background: GREEN }} />
              <div style={{ width: `${(r.r / maxTotal) * 100}%`, background: RED }} />
            </div>
            <span className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-10 text-right">
              <span style={{ color: GREEN }}>{r.l}</span>
              <span className="text-gray-300">/</span>
              <span style={{ color: RED }}>{r.r}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
