import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Classmate, ConditioningSession, ConditioningSessionForm, LeaderboardEntry, StudentDiscipline, TrainingModality, TrainingSession, TrainingSessionForm, TrainingSummary } from '../../../types';
import { trainingApi } from '../../../api/training';
import { conditioningApi } from '../../../api/conditioning';
import { notifySuccess } from '../../../native/haptics';
import { playOss, primeOss } from '../../../native/sound';
import { scheduleStreakReminders } from '../../../native/notifications';
import TrainingForm from '../TrainingForm';
import ConditioningForm from '../ConditioningForm';
import Celebration, { type CelebrationContent, streakMessage } from '../Celebration';
import { computeAchievements, computeConditioningAchievements, takeNewlyUnlocked, type Achievement } from '../achievements';
import { detectPRs, type PR } from '../prDetection';
import PRModal from '../PRModal';
import { buildWeekCardData, drawWeekCard, shareCard } from '../shareWeekCard';
import { computeInsights, type Insight } from './trainingInsights';
import { formatDate, ProgressSkeleton, CardSkeleton } from './shared';
import TrainingCharts from './TrainingCharts';
import StudentInfoModal from './StudentInfoModal';
import BodyDiagram from './BodyDiagram';
import { getMusclesFromFocus, getMusclesFromNames } from '../exerciseCatalog';
import ExerciseProgressModal from '../ExerciseProgressModal';
import BodyWeightCard from '../BodyWeightCard';

interface Props {
  studentId: number;
  disciplines: StudentDiscipline[];
  studentName: string;
  academyName?: string | null;
}

const MODALITY_LABEL: Record<string, string> = {
  GI: 'Gi',
  NOGI: 'No-Gi',
  OPEN_MAT: 'Open Mat',
  COMPETITION: 'Competición',
  FISICO: 'Físico',
};

type HistoryFilter = 'ALL' | 'FISICO' | TrainingModality;

/** History filter chips: everything, the conditioning (gym) log, plus one per BJJ session type. */
const HISTORY_FILTERS: Array<{ key: HistoryFilter; label: string }> = [
  { key: 'ALL', label: 'Todo' },
  { key: 'GI', label: 'Gi' },
  { key: 'NOGI', label: 'No-Gi' },
  { key: 'OPEN_MAT', label: 'Open Mat' },
  { key: 'COMPETITION', label: 'Competición' },
  { key: 'FISICO', label: 'Físico' },
];

/**
 * "Trained today" across BOTH journals — a gym (físico) day keeps the streak warm too, same as it
 * counts toward the streak on the backend. Used so the streak chip / reminders don't show "running
 * out" when the only session today was conditioning. Local YYYY-MM-DD matches the backend date string.
 */
const trainedTodayAny = (sessions: TrainingSession[], cond: ConditioningSession[]) => {
  const today = new Date().toLocaleDateString('en-CA');
  return sessions.some((s) => s.date === today) || cond.some((c) => !c.backdated && c.date === today);
};

/** "Entreno" — personal training journal: weekly goal/streak + quick log + recent sessions. */
export default function TrainingSection({ studentId, disciplines, studentName, academyName }: Props) {
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [cardFor, setCardFor] = useState<number | null>(null); // ranking → student info modal
  const [detailFor, setDetailFor] = useState<TrainingSession | null>(null); // history → session detail
  const [shareView, setShareView] = useState<{ canvas: HTMLCanvasElement; dataUrl: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [kickFormOpen, setKickFormOpen] = useState(false); // log a kickboxing (striking) session
  const [condSessions, setCondSessions] = useState<ConditioningSession[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false); // pick BJJ / kickboxing / conditioning to log
  const [condFormOpen, setCondFormOpen] = useState(false);
  const [condDetailFor, setCondDetailFor] = useState<ConditioningSession | null>(null);
  // Home shows the summary; history (sessions + trends) lives one tap away.
  const [view, setView] = useState<'resumen' | 'historial'>('resumen');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL');
  const [savingGoal, setSavingGoal] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  // Celebrations queue up (weekly goal → streak → achievements) and show one at a time.
  const [celebrations, setCelebrations] = useState<CelebrationContent[]>([]);
  const [prResults, setPrResults] = useState<PR[]>([]);

  const celebrate = (c: CelebrationContent) => setCelebrations((prev) => [...prev, c]);

  const celebrateAchievements = (fresh: Achievement[]) => {
    for (const a of fresh) {
      celebrate({
        eyebrow: 'Logro desbloqueado',
        emoji: a.emoji,
        count: a.target,
        unit: a.unit,
        message: `¡${a.title}!`,
        buttonLabel: '¡Genial!',
      });
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, list, mates, ranking, cond] = await Promise.all([
        trainingApi.summary(studentId),
        trainingApi.list(studentId),
        trainingApi.classmates(studentId).catch(() => [] as Classmate[]),
        trainingApi.leaderboard(studentId).catch(() => [] as LeaderboardEntry[]),
        conditioningApi.list(studentId).catch(() => [] as ConditioningSession[]),
      ]);
      setSummary(sum);
      setSessions(list);
      setClassmates(mates);
      setBoard(ranking);
      setCondSessions(cond);
      // Refresh the native streak reminders so their copy reflects the current state.
      void scheduleStreakReminders(sum.currentStreak, trainedTodayAny(list, cond), {
        lostStreak: sum.lostStreak,
        repairAvailable: sum.repairAvailable,
      });
      // Seed (or silently sync) the seen-achievements set so saves only celebrate new unlocks.
      takeNewlyUnlocked(computeAchievements(list, sum));
    } catch {
      setSummary(null);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const insights = useMemo(() => computeInsights(sessions), [sessions]);

  const filteredSessions = useMemo(
    // "Físico" hides BJJ entirely; a specific BJJ modality filters by it.
    () => (historyFilter === 'ALL' ? sessions
      : historyFilter === 'FISICO' ? []
      : sessions.filter((s) => s.modality === historyFilter)),
    [sessions, historyFilter],
  );

  // History merges BJJ + conditioning chronologically. Conditioning shows under "Todo" and "Físico".
  const historyItems = useMemo(() => {
    const bjj = filteredSessions.map((s) => ({ kind: 'bjj' as const, key: `b${s.id}`, date: s.date, created: s.createdAt, s }));
    const cond = (historyFilter === 'ALL' || historyFilter === 'FISICO' ? condSessions : [])
      .map((c) => ({ kind: 'cond' as const, key: `c${c.id}`, date: c.date, created: c.createdAt, c }));
    return [...bjj, ...cond].sort((a, b) => b.date.localeCompare(a.date) || (b.created ?? '').localeCompare(a.created ?? ''));
  }, [filteredSessions, condSessions, historyFilter]);

  // Distinct exercise names the student has used (most recent first) — seeds the form autocomplete.
  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of condSessions) {
      for (const ex of c.exercises) {
        const n = ex.name.trim();
        const k = n.toLowerCase();
        if (n && !seen.has(k)) { seen.add(k); out.push(n); }
      }
    }
    return out.slice(0, 20);
  }, [condSessions]);

  const handleSave = (data: TrainingSessionForm) => saveTrainingSession(() => trainingApi.create(studentId, data));
  // Kickboxing is a TrainingSession too, so it shares the exact same post-save flow (streak, goal, badges).
  const handleSaveKickboxing = (data: TrainingSessionForm) => saveTrainingSession(() => trainingApi.createKickboxing(studentId, data));

  const saveTrainingSession = async (create: () => Promise<unknown>) => {
    const prevStreak = summary?.currentStreak ?? 0;
    const prevGoalMet = summary?.weeklyGoalMet ?? false;
    // Unlock the cue inside the tap's user-gesture window (after the `await` the browser
    // drops user activation and autoplay-blocks the audio). It only actually sounds once
    // the backend confirms the save below — a failed save throws and the OSS never plays.
    primeOss();
    await create();
    playOss();
    void notifySuccess();
    try {
    // Fetch fresh stats directly (load()'s state update isn't visible in this closure)
    // so we can tell whether this session hit a milestone.
    const [sum, list] = await Promise.all([trainingApi.summary(studentId), trainingApi.list(studentId)]);
    setSummary(sum);
    setSessions(list);
    void scheduleStreakReminders(sum.currentStreak, trainedTodayAny(list, condSessions), {
      lostStreak: sum.lostStreak,
      repairAvailable: sum.repairAvailable,
    });

    // Celebrate the bigger event first: completing the weekly goal outranks a +1 day streak.
    if (!prevGoalMet && sum.weeklyGoalMet) {
      celebrate({
        eyebrow: '¡Meta semanal!',
        emoji: '🏆',
        count: sum.thisWeekCount,
        unit: `de ${sum.weeklyGoal} entrenos esta semana`,
        message: '¡Cumpliste tu meta de la semana! 💪',
        buttonLabel: '¡Excelente!',
      });
    } else if (sum.currentStreak > prevStreak) {
      celebrate({
        eyebrow: 'Racha en marcha',
        emoji: '🔥',
        count: sum.currentStreak,
        unit: sum.currentStreak === 1 ? 'día seguido entrenando' : 'días seguidos entrenando',
        message: streakMessage(sum.currentStreak),
      });
    }
    // Any badges this session unlocked queue up after the goal/streak celebration.
    celebrateAchievements(takeNewlyUnlocked(computeAchievements(list, sum)));
    // Refresh the leaderboard in the background — the new session may move positions.
    trainingApi.leaderboard(studentId).then(setBoard).catch(() => { /* keep the stale board */ });
    } catch { /* the session saved; a failed stats refresh shouldn't look like a save error */ }
  };

  const handleSaveConditioning = async (data: ConditioningSessionForm) => {
    const prevStreak = summary?.currentStreak ?? 0;
    // Snapshot history BEFORE saving so we can compare for PRs
    const historySnapshot = [...condSessions];
    // Unlock the cue within the tap gesture; it only sounds after a confirmed save below.
    primeOss();
    await conditioningApi.create(studentId, data);
    playOss();
    void notifySuccess();
    try {
    const [sum, cond, list] = await Promise.all([
      trainingApi.summary(studentId),
      conditioningApi.list(studentId),
      trainingApi.list(studentId),
    ]);
    setSummary(sum);
    setCondSessions(cond);
    // "Trained today" spans both journals (a gym day keeps the streak too).
    void scheduleStreakReminders(sum.currentStreak, trainedTodayAny(list, cond), {
      lostStreak: sum.lostStreak,
      repairAvailable: sum.repairAvailable,
    });
    if (sum.currentStreak > prevStreak) {
      celebrate({
        eyebrow: 'Racha en marcha',
        emoji: '🔥',
        count: sum.currentStreak,
        unit: sum.currentStreak === 1 ? 'día seguido entrenando' : 'días seguidos entrenando',
        message: streakMessage(sum.currentStreak),
      });
    }
    // Conditioning badges unlocked by this session queue up after the streak celebration.
    celebrateAchievements(takeNewlyUnlocked(computeConditioningAchievements(cond)));
    // PR detection — compare new session exercises against history captured before saving
    if (data.exercises && data.exercises.length > 0) {
      const prs = detectPRs(data.exercises, historySnapshot);
      if (prs.length > 0) setPrResults(prs);
    }
    } catch { /* the session saved; a failed stats refresh shouldn't look like a save error */ }
  };

  const handleRepair = async () => {
    setRepairing(true);
    setRepairError(null);
    try {
      const sum = await trainingApi.repairStreak(studentId);
      setSummary(sum);
      void notifySuccess();
      void scheduleStreakReminders(sum.currentStreak, trainedTodayAny(sessions, condSessions), {
        lostStreak: sum.lostStreak,
        repairAvailable: sum.repairAvailable,
      });
      celebrate({
        eyebrow: '¡Racha reavivada!',
        emoji: '🔥',
        count: sum.currentStreak,
        unit: sum.currentStreak === 1 ? 'día de racha' : 'días de racha',
        message: '¡Reavivaste tu racha! Entrena hoy para seguir sumando 🔥',
        buttonLabel: '¡A entrenar!',
      });
      // A revived streak can retro-unlock streak badges (maxStreak may have grown).
      celebrateAchievements(takeNewlyUnlocked(computeAchievements(sessions, sum)));
    } catch (e) {
      setRepairError(e instanceof Error ? e.message : 'No se pudo recuperar la racha.');
    } finally {
      setRepairing(false);
    }
  };

  const openShare = () => {
    const data = buildWeekCardData(studentName, academyName ?? null, sessions, summary, board, studentId);
    const canvas = drawWeekCard(data);
    setShareView({ canvas, dataUrl: canvas.toDataURL('image/png') });
    setShareNote(null);
  };

  const handleShare = async () => {
    if (!shareView) return;
    setSharing(true);
    try {
      const result = await shareCard(shareView.canvas);
      if (result === 'shared') setShareView(null);
      else if (result === 'downloaded') setShareNote('Imagen descargada 📥');
      // 'aborted': the user closed the share sheet — keep the preview open, no message.
    } catch {
      setShareNote('No se pudo compartir la imagen.');
    } finally {
      setSharing(false);
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

  const handleDeleteConditioning = async (id: number) => {
    setCondSessions((prev) => prev.filter((c) => c.id !== id));
    try {
      await conditioningApi.remove(studentId, id);
      const sum = await trainingApi.summary(studentId);
      setSummary(sum);
    } catch {
      void load(); // restore on failure
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <ProgressSkeleton />
      <CardSkeleton lines={2} />
    </div>
  );

  const goal = summary?.weeklyGoal ?? null;

  return (
    <div className="space-y-6">
      {/* Broken streak still within the repair window — rescue banner */}
      {summary?.repairAvailable && summary.lostStreak > 0 && (
        <div className="rounded-2xl border border-orange-300/70 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3.5">
            <span className="text-3xl leading-none mt-0.5 grayscale opacity-80" aria-hidden>🔥</span>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-orange-900">
                Tu racha de {summary.lostStreak} {summary.lostStreak === 1 ? 'día' : 'días'} se apagó
              </h2>
              <p className="text-sm text-orange-800/80 mt-0.5">
                Aún estás a tiempo de reavivarla. Te {summary.repairsLeft === 1 ? 'queda' : 'quedan'}{' '}
                {summary.repairsLeft} {summary.repairsLeft === 1 ? 'recuperación' : 'recuperaciones'} este mes.
              </p>
              {repairError && <p className="text-sm text-red-600 mt-1">{repairError}</p>}
              <button
                onClick={handleRepair}
                disabled={repairing}
                className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-orange-500/30 transition-colors disabled:opacity-50"
              >
                {repairing ? 'Reavivando…' : '🔥 Reavivar mi racha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal not set yet — onboarding step */}
      {goal == null ? (
        <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
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
        <ProgressCard
          summary={summary!}
          trainedToday={trainedTodayAny(sessions, condSessions)}
          onChangeGoal={handleSetGoal}
          savingGoal={savingGoal}
          onShare={sessions.length > 0 ? openShare : undefined}
        />
      )}

      {/* Resumen | Historial segmented control */}
      <div className="bg-gray-200/70 rounded-xl p-1 flex">
        {([['resumen', 'Resumen'], ['historial', `Historial (${sessions.length + condSessions.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'resumen' ? (
        <>
          {/* Narrative insights — the "at a glance" read of your game */}
          <InsightsCard insights={insights} hasSessions={sessions.length > 0} />
          <TrainingCharts sessions={sessions} />
          <div data-tour="peso"><BodyWeightCard studentId={studentId} /></div>
          <LeaderboardCard board={board} meId={studentId} onOpen={setCardFor} />
        </>
      ) : (
        <>
          {/* Session-type filter */}
          {(sessions.length > 0 || condSessions.length > 0) && (
            <div className="flex gap-2 overflow-x-auto scroll-smooth pb-1 -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setHistoryFilter(f.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    historyFilter === f.key
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-primary-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {/* Spacer so el último chip no queda pegado al borde */}
              <div className="flex-shrink-0 w-2" />
            </div>
          )}

          {/* Recent sessions */}
          <div className="bg-white rounded-xl shadow-sm jjp-accent-bar">
            <div className="p-5">
              {sessions.length === 0 && condSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">Aún no registras entrenamientos.</p>
                  <p className="text-gray-300 text-xs mt-1">Toca el botón + al salir del tatami 🥋</p>
                </div>
              ) : historyItems.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">
                  No tienes entrenos de tipo {MODALITY_LABEL[historyFilter] ?? historyFilter}.
                </p>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((it) => it.kind === 'bjj'
                    ? <SessionRow key={it.key} s={it.s} onDelete={() => handleDelete(it.s.id)} onOpen={() => setDetailFor(it.s)} />
                    : <ConditioningRow key={it.key} c={it.c} onDelete={() => handleDeleteConditioning(it.c.id)} onOpen={() => setCondDetailFor(it.c)} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Floating action button: the one primary action, always within thumb reach. */}
      <button
        data-tour="registrar-entreno"
        onClick={() => setChooserOpen(true)}
        aria-label="Registrar entrenamiento"
        title="Registrar entrenamiento"
        className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/40 flex items-center justify-center transition-transform active:scale-95"
      >
        <span className="text-3xl leading-none -mt-0.5">+</span>
      </button>

      {chooserOpen && (
        <LogChooser
          onClose={() => setChooserOpen(false)}
          onPick={(kind) => {
            setChooserOpen(false);
            if (kind === 'bjj') setFormOpen(true);
            else if (kind === 'kick') setKickFormOpen(true);
            else setCondFormOpen(true);
          }}
        />
      )}

      {formOpen && (
        <TrainingForm
          disciplines={disciplines}
          recentSessions={sessions}
          classmates={classmates}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {kickFormOpen && (
        <TrainingForm
          variant="striking"
          disciplines={[]}
          recentSessions={sessions}
          classmates={classmates}
          onClose={() => setKickFormOpen(false)}
          onSave={handleSaveKickboxing}
        />
      )}

      {condFormOpen && (
        <ConditioningForm recentExercises={recentExercises} onClose={() => setCondFormOpen(false)} onSave={handleSaveConditioning} />
      )}

      {condDetailFor && <ConditioningDetail c={condDetailFor} allSessions={condSessions} studentName={studentName} academyName={academyName} onClose={() => setCondDetailFor(null)} />}

      {/* Week-card preview + share */}
      {shareView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 pt-safe pb-safe"
          onClick={() => setShareView(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={shareView.dataUrl} alt="Resumen de mi semana" className="w-full rounded-xl" />
            {shareNote && <p className="text-center text-sm text-gray-500 mt-2">{shareNote}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShareView(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {sharing ? 'Compartiendo…' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrations.length > 0 && (
        <Celebration
          {...celebrations[0]}
          // Remount when the head of the queue changes so the choreography replays.
          key={`${celebrations[0].message}-${celebrations[0].count}`}
          onClose={() => setCelebrations((prev) => prev.slice(1))}
        />
      )}

      {prResults.length > 0 && celebrations.length === 0 && (
        <PRModal prs={prResults} onClose={() => setPrResults([])} />
      )}

      {cardFor != null && (
        <StudentInfoModal viewerId={studentId} targetId={cardFor} onClose={() => setCardFor(null)} />
      )}

      {detailFor && <SessionDetail s={detailFor} studentName={studentName} academyName={academyName} onClose={() => setDetailFor(null)} />}
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Academy ranking by sessions this week (streak as tiebreaker); the logged-in student is
 * highlighted. Compact by default (top 3 + my position) — "Ver todo" expands to 10.
 */
function LeaderboardCard({ board, meId, onOpen }: { board: LeaderboardEntry[]; meId: number; onOpen: (studentId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (board.length < 2) return null; // a single-person ranking isn't a ranking

  const visibleCount = expanded ? 10 : 3;
  const top = board.slice(0, visibleCount);
  const myIndex = board.findIndex((e) => e.studentId === meId);

  return (
    <div className="bg-white rounded-xl shadow-sm jjp-accent-bar">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Ranking de la semana 🏆</h2>
        <p className="text-xs text-gray-400 mt-0.5">Entrenos registrados esta semana en tu academia</p>
      </div>
      <div className="p-3">
        {top.map((e, i) => {
          const isMe = e.studentId === meId;
          return (
            <button
              key={e.studentId}
              onClick={() => onOpen(e.studentId)}
              className={`w-full text-left flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors ${isMe ? 'bg-primary-50' : ''}`}
            >
              <span className="w-7 text-center text-sm font-bold text-gray-500 flex-shrink-0">
                {MEDALS[i] ?? i + 1}
              </span>
              {e.photoUrl ? (
                <img src={e.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {e.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={`flex-1 min-w-0 truncate text-sm ${isMe ? 'font-bold text-primary-700' : 'text-gray-700'}`}>
                {e.name} {isMe && <span className="text-[10px] font-semibold text-primary-500">(tú)</span>}
              </span>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {e.thisWeekCount} <span className="text-xs font-normal text-gray-400">entrenos</span>
              </span>
              <span className="text-xs font-semibold w-12 text-right flex-shrink-0 text-orange-500">
                {e.currentStreak > 0 ? `🔥 ${e.currentStreak}` : ''}
              </span>
            </button>
          );
        })}
        {/* If I'm below the visible rows, pin my position at the bottom so it's always in sight. */}
        {myIndex >= visibleCount && (
          <div className="mt-1 pt-2 border-t border-dashed border-gray-200">
            <button onClick={() => onOpen(board[myIndex].studentId)} className="w-full text-left flex items-center gap-3 rounded-lg px-2 py-2 bg-primary-50 hover:bg-primary-100 transition-colors">
              <span className="w-7 text-center text-sm font-bold text-gray-500 flex-shrink-0">{myIndex + 1}</span>
              <span className="flex-1 min-w-0 truncate text-sm font-bold text-primary-700">
                {board[myIndex].name} <span className="text-[10px] font-semibold text-primary-500">(tú)</span>
              </span>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                {board[myIndex].thisWeekCount} <span className="text-xs font-normal text-gray-400">entrenos</span>
              </span>
            </button>
          </div>
        )}
        {board.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full mt-1 py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todo (${Math.min(board.length, 10)})`}
          </button>
        )}
      </div>
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

/** Hero card: weekly ring + streak + month totals in one block, with share/goal tucked into the corner. */
// Custom JJPlatform icons (stroke style, tint with currentColor) — matches the
// hand-drawn martial-arts icon set in the tab bar instead of generic emojis.
const ICON = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ShareIcon() {
  return (
    <svg {...ICON}>
      <path d="M12 3.5v10.5" />
      <path d="M8 7l4-3.5L16 7" />
      <path d="M5 13.5v4A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-4" />
    </svg>
  );
}

function EditGoalIcon() {
  return (
    <svg {...ICON}>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2 4 20z" />
      <path d="M14.2 8l1.8 1.8" />
    </svg>
  );
}

function ProgressCard({ summary, trainedToday, onChangeGoal, savingGoal, onShare }: { summary: TrainingSummary; trainedToday: boolean; onChangeGoal: (n: number) => void; savingGoal: boolean; onShare?: () => void }) {
  const goal = summary.weeklyGoal ?? 1;
  const pct = Math.min(100, Math.round((summary.thisWeekCount / goal) * 100));
  const [editing, setEditing] = useState(false);
  const monthHours = Math.round((summary.monthMinutes / 60) * 10) / 10;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
      <div className="flex items-center gap-5">
        <Ring pct={pct} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">Esta semana</p>
          <p className="text-2xl font-bold text-gray-900">{summary.thisWeekCount}<span className="text-base font-medium text-gray-400"> / {goal}</span></p>
          <div className="flex items-center gap-x-3 gap-y-1.5 mt-2 flex-wrap">
            <StreakChip streak={summary.currentStreak} trainedToday={trainedToday} />
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1 h-1 rounded-full bg-gray-300" aria-hidden />
              Récord: {summary.maxStreak}
            </span>
            {summary.weeklyGoalMet && (
              <span className="text-xs font-semibold text-green-600" title="¡Cumpliste tu meta semanal!">
                ✅ Meta semanal cumplida
              </span>
            )}
          </div>
        </div>
        <div className="self-start flex items-center gap-4">
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Compartir mi semana"
              title="Compartir mi semana"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <ShareIcon />
            </button>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            aria-label="Cambiar meta semanal"
            title="Cambiar meta semanal"
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
              editing
                ? 'border-primary-300 bg-primary-50 text-primary-600'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600'
            }`}
          >
            <EditGoalIcon />
          </button>
        </div>
      </div>
      {summary.monthSessions > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="jjp-label mb-2.5">Este mes</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: summary.monthSessions, l: summary.monthSessions === 1 ? 'entreno' : 'entrenos', c: 'var(--c-blue, #4D8DFF)' },
              { v: monthHours, l: 'horas', c: 'var(--c-green, #34D399)' },
              { v: summary.monthRounds, l: 'rounds', c: 'var(--c-purple, #A78BFA)' },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl py-2.5 text-center border border-gray-100"
                style={{ background: 'var(--surface-2, #f3f4f6)' }}
              >
                <div className="text-xl font-extrabold leading-none" style={{ color: s.c }}>{s.v}</div>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      <circle cx="38" cy="38" r={r} fill="none" strokeWidth="7" style={{ stroke: 'var(--surface-2, #e5e7eb)' }} />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
        className="text-primary-600"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="38" y="43" textAnchor="middle" className="font-bold" fontSize="16" style={{ fill: 'var(--text, #374151)' }}>{pct}%</text>
    </svg>
  );
}

function InsightsCard({ insights, hasSessions }: { insights: Insight[]; hasSessions: boolean }) {
  // Teaching empty state: explain how to fill it instead of showing a blank card.
  if (insights.length === 0) {
    if (!hasSessions) return null; // history empty state already covers the very first run
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
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
    <div className="bg-white rounded-xl shadow-sm p-5 pl-6 jjp-accent-bar">
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

function SessionRow({ s, onDelete, onOpen }: { s: TrainingSession; onDelete: () => void; onOpen: () => void }) {
  const subsLogradas = s.submissions.filter((x) => x.direction === 'LOGRADA').length;
  const subsRecibidas = s.submissions.filter((x) => x.direction === 'RECIBIDA').length;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
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
      </button>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 px-1 flex-shrink-0" aria-label="Eliminar">🗑</button>
    </div>
  );
}

/** Full detail of a training session, opened from the history (styled like the achievement detail). */
function SessionDetail({ s, studentName, academyName, onClose }: { s: TrainingSession; studentName: string; academyName?: string | null; onClose: () => void }) {
  const [sharing, setSharing] = useState(false);
  const logradas = s.submissions.filter((x) => x.direction === 'LOGRADA');
  const recibidas = s.submissions.filter((x) => x.direction === 'RECIBIDA');
  const stats: Array<{ label: string; value: string }> = [];
  if (s.durationMin != null) stats.push({ label: 'Duración', value: `${s.durationMin} min` });
  if (s.roundsCount != null && s.roundsCount > 0) stats.push({ label: 'Rounds', value: String(s.roundsCount) });
  if (s.energy != null) stats.push({ label: 'Energía', value: `⚡ ${s.energy}/5` });
  if (s.performance != null) stats.push({ label: 'Desempeño', value: `⭐ ${s.performance}/5` });

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { drawSessionCard, shareCard } = await import('../shareWeekCard');
      const canvas = drawSessionCard({
        date: s.date,
        modality: s.modality,
        disciplineName: s.disciplineName,
        durationMin: s.durationMin,
        roundsCount: s.roundsCount,
        energy: s.energy,
        performance: s.performance,
        techniques: s.techniques,
        submissionsWon: logradas.map((x) => x.name),
        submissionsLost: recibidas.map((x) => x.name),
        partners: s.partners.map((p) => ({ name: p.name, belt: p.belt ?? null })),
        notes: s.notes,
        studentName,
        academyName: academyName ?? null,
      });
      await shareCard(canvas, `entreno-${s.date}.png`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl jjp-pop max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleShare} disabled={sharing} className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
            {sharing ? '...' : '📤 Compartir'}
          </button>
          <button onClick={onClose} className="text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        </div>

        <div className="px-6 pb-6">
        <div className="text-center">
          <p className="text-lg font-extrabold text-gray-900">{formatDate(s.date)}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {s.modality && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{MODALITY_LABEL[s.modality]}</span>}
            {s.disciplineName && <span className="text-xs text-gray-400">{s.disciplineName}</span>}
            {s.backdated && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">Registrado tarde</span>}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stats.map((st) => (
              <div key={st.label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-center">
                <p className="text-[11px] text-gray-400">{st.label}</p>
                <p className="text-sm font-semibold text-gray-800">{st.value}</p>
              </div>
            ))}
          </div>
        )}

        {s.techniques.length > 0 && (
          <DetailBlock title="Técnicas">
            <div className="flex flex-wrap gap-1.5">
              {s.techniques.map((t, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </DetailBlock>
        )}

        {(logradas.length > 0 || recibidas.length > 0) && (
          <DetailBlock title="Sumisiones">
            {logradas.length > 0 && <p className="text-sm text-green-600">✓ Logradas: {logradas.map((x) => x.name).join(', ')}</p>}
            {recibidas.length > 0 && <p className="text-sm text-red-500 mt-0.5">✕ Recibidas: {recibidas.map((x) => x.name).join(', ')}</p>}
          </DetailBlock>
        )}

        {s.partners.length > 0 && (
          <DetailBlock title="Compañeros">
            <ul className="space-y-0.5">
              {s.partners.map((p, i) => (
                <li key={i} className="text-sm text-gray-700">🤝 {p.name}{p.belt ? <span className="text-gray-400"> · {p.belt}</span> : null}</li>
              ))}
            </ul>
          </DetailBlock>
        )}

        {s.notes && (
          <DetailBlock title="Notas">
            <p className="text-sm text-gray-600 italic whitespace-pre-wrap">"{s.notes}"</p>
          </DetailBlock>
        )}
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  );
}

const FOCUS_LABEL: Record<string, string> = {
  PIERNA: '🦵 Pierna', ESPALDA: '🔙 Espalda', PECHO: '🎯 Pecho', HOMBRO: '🤲 Hombro',
  BRAZO: '💪 Brazo', CORE: '🧱 Core', CARDIO: '🏃 Cardio', FULL_BODY: '🔥 Full body',
};

function BeltKnotIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="9" width="19" height="5" rx="2.2" />
      <rect x="9.4" y="7.6" width="5.2" height="7.8" rx="1.6" fill="currentColor" stroke="none" />
      <path d="M10 15.2l-2 5M14 15.2l2 5" />
    </svg>
  );
}

function DumbbellIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
    </svg>
  );
}

function GlovesIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 11V8a2.5 2.5 0 0 1 5 0v2" />
      <path d="M13 9h2.5A2.5 2.5 0 0 1 18 11.5v2A3.5 3.5 0 0 1 14.5 17H10a3 3 0 0 1-3-3v-2a1.5 1.5 0 0 1 1.5-1.5H13" />
      <path d="M8 17.3v1.2A1.5 1.5 0 0 0 9.5 20h4a1.5 1.5 0 0 0 1.5-1.5v-1.6" />
    </svg>
  );
}

/** Chooser shown when tapping +: log a BJJ, kickboxing, or conditioning (gym) session. Centered. */
function LogChooser({ onClose, onPick }: { onClose: () => void; onPick: (kind: 'bjj' | 'kick' | 'cond') => void }) {
  const opt = 'flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50/40 transition-colors';
  const badge = 'w-11 h-11 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center';
  const label = 'text-xs font-semibold text-gray-800 text-center leading-tight';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl jjp-pop">
        <button onClick={onClose} className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        <h2 className="text-center font-bold text-gray-900">¿Qué quieres registrar?</h2>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <button onClick={() => onPick('bjj')} className={opt}>
            <span className={badge}><BeltKnotIcon className="w-6 h-6" /></span>
            <span className={label}>Jiujitsu</span>
          </button>
          <button onClick={() => onPick('kick')} className={opt}>
            <span className={badge}><GlovesIcon className="w-6 h-6" /></span>
            <span className={label}>Kickboxing</span>
          </button>
          <button onClick={() => onPick('cond')} className={opt}>
            <span className={badge}><DumbbellIcon className="w-6 h-6" /></span>
            <span className={label}>Físico</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** History row for a conditioning (gym) session, parallel to SessionRow. */
function ConditioningRow({ c, onDelete, onOpen }: { c: ConditioningSession; onDelete: () => void; onOpen: () => void }) {
  const totalSets = c.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{formatDate(c.date)}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">🏋️ Físico</span>
          {c.focus && <span className="text-xs text-gray-400">{FOCUS_LABEL[c.focus] ?? c.focus}</span>}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
          {c.exercises.length > 0 && <span>🔁 {c.exercises.length} ej · {totalSets} series</span>}
          {c.durationMin != null && <span>⏱ {c.durationMin} min</span>}
        </div>
        {c.notes && <p className="text-xs text-gray-400 italic mt-1 line-clamp-2">"{c.notes}"</p>}
      </button>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 px-1 flex-shrink-0" aria-label="Eliminar">🗑</button>
    </div>
  );
}

/** Full detail of a conditioning session (styled like the BJJ session detail). */
function ConditioningDetail({ c, allSessions, studentName, academyName, onClose }: { c: ConditioningSession; allSessions: ConditioningSession[]; studentName: string; academyName?: string | null; onClose: () => void }) {
  const [progressEx, setProgressEx] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { drawConditioningCard, shareCard } = await import('../shareWeekCard');
      const canvas = await drawConditioningCard({
        date: c.date,
        focus: c.focus,
        durationMin: c.durationMin,
        exercises: c.exercises.map((e) => ({ name: e.name, sets: e.sets })),
        notes: c.notes,
        studentName,
        academyName: academyName ?? null,
      });
      await shareCard(canvas, `gym-${c.date}.png`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl jjp-pop max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleShare} disabled={sharing} className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">
            {sharing ? '...' : '📤 Compartir'}
          </button>
          <button onClick={onClose} className="text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        </div>
        <div className="px-6 pb-6">
        <div className="text-center">
          <p className="text-lg font-extrabold text-gray-900">{formatDate(c.date)}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">🏋️ Acondicionamiento</span>
            {c.focus && <span className="text-xs text-gray-400">{FOCUS_LABEL[c.focus] ?? c.focus}</span>}
            {c.durationMin != null && <span className="text-xs text-gray-400">⏱ {c.durationMin} min</span>}
            {c.backdated && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">Registrado tarde</span>}
          </div>
        </div>

        {(() => {
          const names = c.exercises.map((e) => e.name).filter(Boolean);
          const muscles = names.length > 0 ? getMusclesFromNames(names) : getMusclesFromFocus(c.focus ?? null);
          return muscles.length > 0 ? (
            <div className="mt-4">
              <BodyDiagram muscles={muscles} />
              <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#f97316' }} /> Trabajado</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#cbd5e1' }} /> No objetivo</span>
              </div>
            </div>
          ) : null;
        })()}

        {c.exercises.length > 0 && (
          <DetailBlock title="Ejercicios">
            <div className="space-y-2">
              {c.exercises.map((ex, i) => (
                <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setProgressEx(ex.name)}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700 text-left leading-tight"
                    >
                      {ex.name} <span className="text-[10px] font-normal text-gray-400 ml-1">ver progresión →</span>
                    </button>
                    {ex.restSec != null && <span className="text-[11px] text-gray-400">descanso {ex.restSec}s</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ex.sets.map((s, j) => (
                      <span key={j} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                        {s.reps ?? '–'}{s.weightKg != null ? ` × ${s.weightKg}kg` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DetailBlock>
        )}

        {c.notes && (
          <DetailBlock title="Notas">
            <p className="text-sm text-gray-600 italic whitespace-pre-wrap">"{c.notes}"</p>
          </DetailBlock>
        )}
        </div>
      </div>

      {progressEx && (
        <ExerciseProgressModal
          exerciseName={progressEx}
          sessions={allSessions}
          onClose={() => setProgressEx(null)}
        />
      )}
    </div>
  );
}
