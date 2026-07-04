import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { ConditioningSession, ProInsights, TrainingSession } from '../../../types';
import { trainingApi } from '../../../api/training';

const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const localToday = () => new Date().toLocaleDateString('en-CA');

/**
 * Premium "Progreso Pro" view: deep training-visibility analytics (12-month trends, submission
 * evolution, and a "you vs academy" comparison). Locked behind Pro — non-premium students see a
 * teaser/paywall. Computed mostly from data the portal already loaded (sessions + conditioning).
 */
export default function ProgressPro({
  studentId, sessions, condSessions, isPremium,
}: { studentId: number; sessions: TrainingSession[]; condSessions: ConditioningSession[]; isPremium: boolean }) {
  if (!isPremium) return <ProPaywall />;
  return <ProContent studentId={studentId} sessions={sessions} condSessions={condSessions} />;
}

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ProContent({ studentId, sessions, condSessions }: { studentId: number; sessions: TrainingSession[]; condSessions: ConditioningSession[] }) {
  const [pro, setPro] = useState<ProInsights | null>(null);
  useEffect(() => { trainingApi.proInsights(studentId).then(setPro).catch(() => setPro(null)); }, [studentId]);

  // 12-month volume (BJJ + conditioning) by calendar month.
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS_ABBR[d.getMonth()], count: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const s of sessions) { const i = idx.get(s.date.slice(0, 7)); if (i != null) buckets[i].count++; }
    for (const c of condSessions) { const i = idx.get(c.date.slice(0, 7)); if (i != null) buckets[i].count++; }
    return buckets;
  }, [sessions, condSessions]);
  const monthlyMax = Math.max(1, ...monthly.map((m) => m.count));

  // Submission evolution: landed vs received per submission across all history.
  const subs = useMemo(() => {
    const map = new Map<string, { landed: number; received: number }>();
    for (const s of sessions) {
      for (const x of s.submissions) {
        const e = map.get(x.name) ?? { landed: 0, received: 0 };
        if (x.direction === 'LOGRADA') e.landed++; else e.received++;
        map.set(x.name, e);
      }
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, total: v.landed + v.received }))
      .sort((a, b) => b.landed - a.landed)
      .slice(0, 6);
  }, [sessions]);
  const totalLanded = subs.reduce((n, s) => n + s.landed, 0);
  const totalReceived = subs.reduce((n, s) => n + s.received, 0);

  return (
    <div className="space-y-4">
      {/* AI insight */}
      <InsightsAI studentId={studentId} />

      {/* You vs academy */}
      <Card title="Tú vs tu academia" hint="esta semana">
        {pro && pro.totalStudents > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entrenos esta semana" value={`${pro.yourThisWeek}`} sub={`promedio ${pro.academyAvgThisWeek}`} good={pro.yourThisWeek >= pro.academyAvgThisWeek} />
            <Stat label="Tu racha" value={`${pro.yourStreak} d`} sub={`promedio ${pro.academyAvgStreak} d`} good={pro.yourStreak >= pro.academyAvgStreak} />
            <Stat label="Tu puesto" value={`#${pro.rank}`} sub={`de ${pro.totalStudents}`} good={pro.rank <= Math.ceil(pro.totalStudents / 2)} />
            <Stat label="Estás sobre el" value={`${pro.percentile}%`} sub="de tus compañeros" good={pro.percentile >= 50} />
          </div>
        ) : (
          <p className="text-xs text-gray-400">Sin datos suficientes de la academia todavía.</p>
        )}
      </Card>

      {/* 12-month volume */}
      <Card title="Tu volumen" hint="últimos 12 meses">
        <div className="flex items-end gap-1.5 h-28">
          {monthly.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-primary-500" style={{ height: `${Math.round((m.count / monthlyMax) * 88)}%`, minHeight: m.count > 0 ? 4 : 0 }} title={`${m.count} entrenos`} />
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{monthly.reduce((n, m) => n + m.count, 0)} entrenos en el año.</p>
      </Card>

      {/* Submission evolution */}
      <Card title="Tus sumisiones" hint="histórico">
        {subs.length > 0 ? (
          <>
            <div className="space-y-2">
              {subs.map((s) => {
                const pct = s.total > 0 ? Math.round((s.landed / s.total) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 font-medium">{s.name}</span>
                      <span className="text-gray-400">{s.landed} logradas · {pct}% efectividad</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              En total: <b className="text-green-600">{totalLanded} logradas</b> · <b className="text-red-500">{totalReceived} recibidas</b>.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">Registra sumisiones en tus entrenos para ver tu evolución.</p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${good ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}

/**
 * AI-generated training insight (Pro). On-demand: the student taps "Generar" and the backend returns a
 * fresh analysis, cached for the rest of the day (so it costs at most one AI call per student per day).
 */
function InsightsAI({ studentId }: { studentId: number }) {
  const [insight, setInsight] = useState<{ text: string | null; date: string | null }>({ text: null, date: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    trainingApi.coach(studentId).then(setInsight).catch(() => {});
  }, [studentId]);

  const freshToday = insight.date === localToday();

  const generate = () => {
    setLoading(true);
    setError(false);
    trainingApi
      .generateCoach(studentId)
      .then(setInsight)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  return (
    <Card title="Insights IA ✨" hint={freshToday ? 'hoy' : undefined}>
      {insight.text ? (
        <>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{insight.text}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {freshToday ? 'Generado hoy' : 'Toca para un análisis nuevo'}
            </span>
            <button
              onClick={generate}
              disabled={loading || freshToday}
              className="text-xs font-semibold text-primary-600 disabled:text-gray-300 hover:text-primary-700"
            >
              {loading ? 'Analizando…' : freshToday ? 'Vuelve mañana' : 'Generar de nuevo'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500 mb-3">
            Deja que la IA lea tu entrenamiento y te diga tus fortalezas, tu punto débil y qué drillear.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {loading ? 'Analizando tu progreso…' : 'Generar análisis con IA ✨'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-2 text-center">No se pudo generar ahora. Intenta de nuevo en un momento.</p>}
    </Card>
  );
}

/** Locked state for non-Pro students: blurred teaser + CTA. */
function ProPaywall() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="space-y-4 blur-[3px] select-none pointer-events-none" aria-hidden="true">
        <Card title="Insights IA ✨">
          <p className="text-sm text-gray-700 leading-relaxed">
            Vienes subiendo: 9 entrenos este mes vs 6 el anterior, y tu armbar va 78% de efectividad. Tu
            punto débil son las guillotinas (te cogieron 4 veces). Drillea defensa de guillotina y suma una
            sesión de no-gi por semana.
          </p>
        </Card>
        <Card title="Tú vs tu academia" hint="esta semana">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entrenos esta semana" value="6" sub="promedio 3.2" good />
            <Stat label="Tu racha" value="9 d" sub="promedio 4 d" good />
            <Stat label="Tu puesto" value="#2" sub="de 18" good />
            <Stat label="Estás sobre el" value="88%" sub="de tus compañeros" good />
          </div>
        </Card>
        <Card title="Tu volumen" hint="últimos 12 meses">
          <div className="flex items-end gap-1.5 h-28">
            {[5, 8, 6, 9, 7, 11, 9, 12, 10, 13, 11, 14].map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary-500" style={{ height: `${(v / 14) * 88}%` }} />
            ))}
          </div>
        </Card>
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center max-w-xs">
          <div className="text-3xl mb-2">📈</div>
          <h3 className="font-bold text-gray-900">Progreso Pro</h3>
          <p className="text-sm text-gray-500 mt-1">
            Desbloquea la visibilidad completa de tu entrenamiento: tendencias de 12 meses, evolución de tus
            sumisiones y cómo te comparas con tu academia.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Hazte Pro
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 max-w-xs text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-2">🥋</div>
            <h3 className="font-bold text-gray-900">Activa tu Pro</h3>
            <p className="text-sm text-gray-500 mt-1">
              Habla con tu academia para activar Progreso Pro en tu cuenta.
            </p>
            <button onClick={() => setOpen(false)} className="mt-4 w-full bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
