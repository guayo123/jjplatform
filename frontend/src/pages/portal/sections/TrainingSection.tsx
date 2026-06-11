import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Classmate, StudentDiscipline, TrainingSession, TrainingSessionForm, TrainingSummary } from '../../../types';
import { trainingApi } from '../../../api/training';
import { notifySuccess } from '../../../native/haptics';
import { scheduleStreakReminders } from '../../../native/notifications';
import TrainingForm from '../TrainingForm';
import Celebration, { type CelebrationContent, streakMessage } from '../Celebration';
import { computeInsights, type Insight } from './trainingInsights';
import { formatDate, Spinner } from './shared';

interface Props {
  studentId: number;
  disciplines: StudentDiscipline[];
}

const MODALITY_LABEL: Record<string, string> = { GI: 'Gi', NOGI: 'No-Gi' };

/** Local YYYY-MM-DD for "today" — matches the backend LocalDate string on sessions. */
const trainedToday = (sessions: TrainingSession[]) =>
  sessions.some((s) => s.date === new Date().toLocaleDateString('en-CA'));

/** "Entreno" — personal training journal: weekly goal/streak + quick log + recent sessions. */
export default function TrainingSection({ studentId, disciplines }: Props) {
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationContent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, list, mates] = await Promise.all([
        trainingApi.summary(studentId),
        trainingApi.list(studentId),
        trainingApi.classmates(studentId).catch(() => [] as Classmate[]),
      ]);
      setSummary(sum);
      setSessions(list);
      setClassmates(mates);
      // Refresh the native streak reminders so their copy reflects the current state.
      void scheduleStreakReminders(sum.currentStreak, trainedToday(list), {
        lostStreak: sum.lostStreak,
        repairAvailable: sum.repairAvailable,
      });
    } catch {
      setSummary(null);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const insights = useMemo(() => computeInsights(sessions), [sessions]);

  const handleSave = async (data: TrainingSessionForm) => {
    const prevStreak = summary?.currentStreak ?? 0;
    const prevGoalMet = summary?.weeklyGoalMet ?? false;
    await trainingApi.create(studentId, data);
    void notifySuccess();
    // Fetch fresh stats directly (load()'s state update isn't visible in this closure)
    // so we can tell whether this session hit a milestone.
    const [sum, list] = await Promise.all([trainingApi.summary(studentId), trainingApi.list(studentId)]);
    setSummary(sum);
    setSessions(list);
    void scheduleStreakReminders(sum.currentStreak, trainedToday(list), {
      lostStreak: sum.lostStreak,
      repairAvailable: sum.repairAvailable,
    });

    // Celebrate the bigger event first: completing the weekly goal outranks a +1 day streak.
    if (!prevGoalMet && sum.weeklyGoalMet) {
      setCelebration({
        eyebrow: '¡Meta semanal!',
        emoji: '🏆',
        count: sum.thisWeekCount,
        unit: `de ${sum.weeklyGoal} entrenos esta semana`,
        message: '¡Cumpliste tu meta de la semana! 💪',
        buttonLabel: '¡Excelente!',
      });
    } else if (sum.currentStreak > prevStreak) {
      setCelebration({
        eyebrow: 'Racha en marcha',
        emoji: '🔥',
        count: sum.currentStreak,
        unit: sum.currentStreak === 1 ? 'día seguido entrenando' : 'días seguidos entrenando',
        message: streakMessage(sum.currentStreak),
      });
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    setRepairError(null);
    try {
      const sum = await trainingApi.repairStreak(studentId);
      setSummary(sum);
      void notifySuccess();
      void scheduleStreakReminders(sum.currentStreak, trainedToday(sessions), {
        lostStreak: sum.lostStreak,
        repairAvailable: sum.repairAvailable,
      });
      setCelebration({
        eyebrow: '¡Racha recuperada!',
        emoji: '🚑',
        count: sum.currentStreak,
        unit: sum.currentStreak === 1 ? 'día de racha' : 'días de racha',
        message: '¡Salvaste tu racha! Entrena hoy para seguir sumando 🔥',
        buttonLabel: '¡A entrenar!',
      });
    } catch (e) {
      setRepairError(e instanceof Error ? e.message : 'No se pudo recuperar la racha.');
    } finally {
      setRepairing(false);
    }
  };

  const handleSetGoal = async (goal: number) => {
    setSavingGoal(true);
    try {
      await trainingApi.setGoal(goal);
      await load();
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await trainingApi.remove(studentId, id);
      const sum = await trainingApi.summary(studentId);
      setSummary(sum);
    } catch {
      void load(); // restore on failure
    }
  };

  if (loading) return <Spinner />;

  const goal = summary?.weeklyGoal ?? null;

  return (
    <div className="space-y-6">
      {/* Broken streak still within the repair window — rescue banner */}
      {summary?.repairAvailable && summary.lostStreak > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none">💔</span>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900">
                Perdiste tu racha de {summary.lostStreak} {summary.lostStreak === 1 ? 'día' : 'días'}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Aún estás a tiempo de salvarla. Te queda {summary.repairsLeft}{' '}
                recuperación este mes.
              </p>
              {repairError && <p className="text-sm text-red-600 mt-1">{repairError}</p>}
              <button
                onClick={handleRepair}
                disabled={repairing}
                className="mt-3 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {repairing ? 'Recuperando…' : '🚑 Recuperar mi racha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal not set yet — onboarding step */}
      {goal == null ? (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1">Define tu meta semanal</h2>
          <p className="text-sm text-gray-500 mb-4">¿Cuántas veces quieres entrenar por semana?</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                disabled={savingGoal}
                onClick={() => handleSetGoal(n)}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:border-primary-500 hover:text-primary-600 transition-colors disabled:opacity-50"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ProgressCard summary={summary!} trainedToday={trainedToday(sessions)} onChangeGoal={handleSetGoal} savingGoal={savingGoal} />
      )}

      {/* Quick log button */}
      <button
        onClick={() => setFormOpen(true)}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
      >
        + Registrar entrenamiento
      </button>

      {/* Month stats */}
      {summary && summary.monthSessions > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat value={summary.monthSessions} label="entrenos" sub="este mes" />
          <Stat value={Math.round(summary.monthMinutes / 60 * 10) / 10} label="horas" sub="este mes" />
          <Stat value={summary.monthRounds} label="rounds" sub="este mes" />
        </div>
      )}

      {/* Narrative insights */}
      <InsightsCard insights={insights} hasSessions={sessions.length > 0} />

      {/* Recent sessions */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Historial</h2>
          <p className="text-xs text-gray-400 mt-0.5">{sessions.length} entreno{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="p-5">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Aún no registras entrenamientos.</p>
              <p className="text-gray-300 text-xs mt-1">Toca "Registrar entrenamiento" al salir del tatami 🥋</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => <SessionRow key={s.id} s={s} onDelete={() => handleDelete(s.id)} />)}
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <TrainingForm
          disciplines={disciplines}
          recentSessions={sessions}
          classmates={classmates}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {celebration && (
        <Celebration {...celebration} onClose={() => setCelebration(null)} />
      )}
    </div>
  );
}

/**
 * Streak chip with a state-aware flame: orange while the streak is safe, blue and pulsing
 * when the day is running out without a session (≤6h left), gray smoke when there's no
 * streak to show — so a lost streak never keeps the fire lit.
 */
function StreakChip({ streak, trainedToday }: { streak: number; trainedToday: boolean }) {
  if (streak === 0) {
    return (
      <span className="text-sm font-semibold text-gray-400" title="Registra un entreno para encender tu racha">
        💨 Sin racha
      </span>
    );
  }
  const days = `${streak} ${streak === 1 ? 'día' : 'días'}`;
  if (!trainedToday) {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const hoursLeft = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000));
    if (hoursLeft <= 6) {
      return (
        <span className="text-sm font-semibold text-blue-500" title="Entrena hoy para no perder tu racha">
          <span className="jjp-flame-cold">🔥</span> {days} · quedan {hoursLeft}h
        </span>
      );
    }
  }
  return <span className="text-sm font-semibold text-orange-500">🔥 {days}</span>;
}

function ProgressCard({ summary, trainedToday, onChangeGoal, savingGoal }: { summary: TrainingSummary; trainedToday: boolean; onChangeGoal: (n: number) => void; savingGoal: boolean }) {
  const goal = summary.weeklyGoal ?? 1;
  const pct = Math.min(100, Math.round((summary.thisWeekCount / goal) * 100));
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-5">
        <Ring pct={pct} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">Esta semana</p>
          <p className="text-2xl font-bold text-gray-900">{summary.thisWeekCount}<span className="text-base font-medium text-gray-400"> / {goal}</span></p>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <StreakChip streak={summary.currentStreak} trainedToday={trainedToday} />
            <span className="text-xs text-gray-400">Récord: {summary.maxStreak}</span>
            {summary.weeklyGoalMet && (
              <span className="text-xs font-semibold text-green-600" title="¡Cumpliste tu meta semanal!">
                ✅ Meta semanal cumplida
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          aria-label="Cambiar meta semanal"
          className={`self-start flex items-center gap-1 text-xs font-medium rounded-lg border px-2.5 py-1.5 transition-colors ${
            editing
              ? 'border-primary-300 bg-primary-50 text-primary-600'
              : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          <span>✏️</span> Meta
        </button>
      </div>
      {editing && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2">Cambiar meta semanal</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                disabled={savingGoal}
                onClick={() => { onChangeGoal(n); setEditing(false); }}
                className={`w-10 h-10 rounded-lg border-2 font-bold transition-colors disabled:opacity-50 ${
                  n === goal ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="flex-shrink-0">
      <circle cx="38" cy="38" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
        className="text-primary-600"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="38" y="43" textAnchor="middle" className="fill-gray-700 font-bold" fontSize="16">{pct}%</text>
    </svg>
  );
}

function InsightsCard({ insights, hasSessions }: { insights: Insight[]; hasSessions: boolean }) {
  // Teaching empty state: explain how to fill it instead of showing a blank card.
  if (insights.length === 0) {
    if (!hasSessions) return null; // history empty state already covers the very first run
    return (
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-1">Tus tendencias</h2>
        <p className="text-sm text-gray-400">
          Registra modalidad, sumisiones (logradas/recibidas) y técnicas, y aquí verás insights de tu juego.
        </p>
      </div>
    );
  }

  const toneClass: Record<Insight['tone'], string> = {
    good: 'text-green-600',
    bad: 'text-red-500',
    neutral: 'text-gray-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-3">Tus tendencias</h2>
      <ul className="space-y-2.5">
        {insights.map((ins, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5 flex-shrink-0">{ins.icon}</span>
            <span className={`text-sm ${toneClass[ins.tone]}`}>{ins.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-[10px] text-gray-300">{sub}</p>
    </div>
  );
}

function SessionRow({ s, onDelete }: { s: TrainingSession; onDelete: () => void }) {
  const subsLogradas = s.submissions.filter((x) => x.direction === 'LOGRADA').length;
  const subsRecibidas = s.submissions.filter((x) => x.direction === 'RECIBIDA').length;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{formatDate(s.date)}</span>
          {s.modality && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{MODALITY_LABEL[s.modality]}</span>}
          {s.disciplineName && <span className="text-xs text-gray-400">{s.disciplineName}</span>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
          {s.durationMin != null && <span>⏱ {s.durationMin} min</span>}
          {s.roundsCount != null && s.roundsCount > 0 && <span>🥋 {s.roundsCount} rounds</span>}
          {subsLogradas > 0 && <span className="text-green-600">✓ {subsLogradas}</span>}
          {subsRecibidas > 0 && <span className="text-red-500">✕ {subsRecibidas}</span>}
          {s.energy != null && <span>⚡{s.energy}</span>}
          {s.performance != null && <span>⭐{s.performance}</span>}
        </div>
        {s.partners.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">🤝 {s.partners.map((p) => p.name).join(', ')}</p>
        )}
        {s.notes && <p className="text-xs text-gray-400 italic mt-1 line-clamp-2">"{s.notes}"</p>}
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 px-1 flex-shrink-0" aria-label="Eliminar">🗑</button>
    </div>
  );
}
