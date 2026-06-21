import { useMemo, useState } from 'react';
import type { ConditioningSession } from '../../types';

interface DataPoint {
  date: string;    // YYYY-MM-DD
  weightKg: number;
  reps: number;
}

interface Props {
  exerciseName: string;
  sessions: ConditioningSession[];
  onClose: () => void;
}

export default function ExerciseProgressModal({ exerciseName, sessions, onClose }: Props) {
  // Collect all sets for this exercise across all sessions
  const allPoints = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [];
    const nameKey = exerciseName.trim().toLowerCase();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (ex.name.trim().toLowerCase() !== nameKey) continue;
        for (const set of ex.sets) {
          if (set.reps == null || set.weightKg == null || set.weightKg <= 0) continue;
          points.push({ date: s.date, weightKg: set.weightKg, reps: set.reps });
        }
      }
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }, [exerciseName, sessions]);

  // Available rep counts, sorted asc
  const repOptions = useMemo(() => {
    const counts = [...new Set(allPoints.map((p) => p.reps))].sort((a, b) => a - b);
    return counts;
  }, [allPoints]);

  const [selectedReps, setSelectedReps] = useState<number | null>(() => {
    // Default to the most common rep count
    if (allPoints.length === 0) return null;
    const freq = new Map<number, number>();
    for (const p of allPoints) freq.set(p.reps, (freq.get(p.reps) ?? 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  });

  // Best weight per date for selected reps
  const chartPoints = useMemo(() => {
    const filtered = selectedReps == null
      ? allPoints
      : allPoints.filter((p) => p.reps === selectedReps);
    // For each date, keep the max weight
    const byDate = new Map<string, number>();
    for (const p of filtered) {
      const prev = byDate.get(p.date) ?? 0;
      if (p.weightKg > prev) byDate.set(p.date, p.weightKg);
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allPoints, selectedReps]);

  const pr = chartPoints.length > 0 ? Math.max(...chartPoints.map(([, w]) => w)) : null;
  const hasData = chartPoints.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-0.5">Progresión</p>
            <h2 className="font-extrabold text-gray-900 text-base leading-tight">{exerciseName}</h2>
            {pr != null && (
              <p className="text-xs text-gray-400 mt-0.5">🏆 PR: <span className="font-bold text-orange-500">{pr} kg</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Rep count selector */}
          {repOptions.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {repOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedReps(r)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    selectedReps === r
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {r} {r === 1 ? 'rep' : 'reps'}
                </button>
              ))}
            </div>
          )}

          {/* Chart */}
          {!hasData ? (
            <p className="text-center py-10 text-sm text-gray-400">Sin datos para este filtro.</p>
          ) : chartPoints.length === 1 ? (
            <SinglePointCard point={chartPoints[0]} />
          ) : (
            <ProgressChart points={chartPoints} pr={pr!} />
          )}

          {/* Data table */}
          {hasData && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wide">
                    <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                    <th className="text-right px-4 py-2 font-semibold">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chartPoints].reverse().map(([date, weight], i) => (
                    <tr key={date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2 text-gray-600">{formatDate(date)}</td>
                      <td className={`px-4 py-2 text-right font-bold ${weight === pr ? 'text-orange-500' : 'text-gray-800'}`}>
                        {weight} kg {weight === pr && '🏆'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SVG line chart ─────────────────────────────────────────────────────────

function ProgressChart({ points, pr }: { points: [string, number][]; pr: number }) {
  const W = 320, H = 140, PAD = { t: 16, r: 16, b: 28, l: 40 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const weights = points.map(([, w]) => w);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const xs = points.map((_, i) => PAD.l + (i / Math.max(points.length - 1, 1)) * iW);
  const ys = points.map(([, w]) => PAD.t + iH - ((w - minW) / range) * iH);

  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${xs[xs.length - 1].toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l.toFixed(1)},${(PAD.t + iH).toFixed(1)} Z`;

  // Y-axis labels
  const yTicks = [minW, minW + range / 2, maxW];

  // X-axis: show first, last, and middle date
  const xLabels = [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i && v < points.length)
    .map((i) => ({ x: xs[i], label: shortDate(points[i][0]) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <defs>
        <linearGradient id="ep-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((v, i) => {
        const y = PAD.t + iH - ((v - minW) / range) * iH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#ep-grad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* PR dot (max) */}
      {points.map(([, w], i) => w === pr && (
        <circle key={`pr-${i}`} cx={xs[i]} cy={ys[i]} r="5" fill="#f97316" stroke="white" strokeWidth="2" />
      ))}

      {/* Regular dots */}
      {points.map(([, w], i) => w !== pr && (
        <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill="white" stroke="#f97316" strokeWidth="1.5" />
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
      ))}
    </svg>
  );
}

function SinglePointCard({ point }: { point: [string, number] }) {
  return (
    <div className="flex flex-col items-center py-8 gap-1 text-center">
      <p className="text-4xl font-extrabold text-orange-500">{point[1]} kg</p>
      <p className="text-sm text-gray-400">{formatDate(point[0])}</p>
      <p className="text-xs text-gray-300 mt-2">Registra más sesiones para ver la progresión</p>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}
