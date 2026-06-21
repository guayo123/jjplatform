import { useState } from 'react';
import { deleteWeightEntry, loadWeightEntries, logWeight, todayYmd, type WeightEntry } from './bodyWeight';

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

// ── mini sparkline (last 8 entries) ───────────────────────────────────────

function Sparkline({ entries }: { entries: WeightEntry[] }) {
  const pts = entries.slice(-8);
  if (pts.length < 2) return null;
  const W = 80, H = 28;
  const weights = pts.map((e) => e.weightKg);
  const min = Math.min(...weights), max = Math.max(...weights), range = max - min || 1;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map((e) => H - ((e.weightKg - min) / range) * (H - 4) - 2);
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <path d={d} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="#f97316" />
    </svg>
  );
}

// ── full chart (modal) ─────────────────────────────────────────────────────

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const W = 320, H = 130, PAD = { t: 12, r: 12, b: 24, l: 38 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const weights = entries.map((e) => e.weightKg);
  const min = Math.floor(Math.min(...weights)) - 1;
  const max = Math.ceil(Math.max(...weights)) + 1;
  const range = max - min;
  const xs = entries.map((_, i) => PAD.l + (i / (entries.length - 1)) * iW);
  const ys = entries.map((e) => PAD.t + iH - ((e.weightKg - min) / range) * iH);
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${xs[xs.length-1].toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l},${(PAD.t+iH).toFixed(1)} Z`;
  const ticks = [min, min + Math.round(range / 2), max];
  const xLabels = [0, Math.floor((entries.length - 1) / 2), entries.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((i) => ({ x: xs[i], label: shortDate(entries[i].date) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      <defs>
        <linearGradient id="bw-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {ticks.map((v, i) => {
        const y = PAD.t + iH - ((v - min) / range) * iH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#bw-grad)" />
      <path d={pathD} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {entries.map((_, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill="white" stroke="#f97316" strokeWidth="1.5" />
      ))}
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
      ))}
    </svg>
  );
}

// ── weight modal ───────────────────────────────────────────────────────────

function WeightModal({ onClose, onChange }: { onClose: () => void; onChange: (entries: WeightEntry[]) => void }) {
  const [entries, setEntries] = useState<WeightEntry[]>(() => loadWeightEntries());
  const [input, setInput] = useState('');
  const today = todayYmd();
  const todayEntry = entries.find((e) => e.date === today);

  const refresh = () => {
    const updated = loadWeightEntries();
    setEntries(updated);
    onChange(updated);
  };

  const handleLog = () => {
    const kg = parseFloat(input.replace(',', '.'));
    if (!kg || kg < 20 || kg > 300) return;
    logWeight(today, kg);
    setInput('');
    refresh();
  };

  const handleDelete = (date: string) => {
    deleteWeightEntry(date);
    refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-0.5">Seguimiento</p>
            <h2 className="font-extrabold text-gray-900">Peso corporal</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quick entry */}
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              {todayEntry ? `Hoy: ${todayEntry.weightKg} kg — actualizar` : 'Registrar peso de hoy'}
            </p>
            <div className="flex gap-2">
              <input
                type="number" inputMode="decimal" step="0.1" min={20} max={300}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLog()}
                placeholder="ej. 73.5"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="self-center text-sm text-gray-500">kg</span>
              <button
                onClick={handleLog}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Chart */}
          {entries.length >= 2 && (
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <WeightChart entries={entries} />
            </div>
          )}

          {/* History table */}
          {entries.length > 0 ? (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wide">
                    <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                    <th className="text-right px-4 py-2 font-semibold">Peso</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((e, i) => (
                    <tr key={e.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2 text-gray-600">{formatDate(e.date)}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">{e.weightKg} kg</td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => handleDelete(e.date)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-6 text-sm text-gray-400">Aún no tienes registros de peso.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main card ──────────────────────────────────────────────────────────────

export default function BodyWeightCard() {
  const [entries, setEntries] = useState<WeightEntry[]>(() => loadWeightEntries());
  const [open, setOpen] = useState(false);

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const delta = latest && prev ? +(latest.weightKg - prev.weightKg).toFixed(1) : null;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm jjp-accent-bar p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-sm">⚖️ Mi peso</h3>
          <button onClick={() => setOpen(true)} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
            {latest ? 'Ver historial' : '+ Registrar'}
          </button>
        </div>

        {latest ? (
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-extrabold text-gray-900 leading-none">{latest.weightKg} <span className="text-base font-semibold text-gray-400">kg</span></p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(latest.date)}</p>
              {delta !== null && (
                <p className={`text-xs font-semibold mt-0.5 ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '—'} kg vs anterior
                </p>
              )}
            </div>
            <Sparkline entries={entries} />
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
          >
            Registra tu peso para ver tu progreso
          </button>
        )}
      </div>

      {open && <WeightModal onClose={() => setOpen(false)} onChange={setEntries} />}
    </>
  );
}
