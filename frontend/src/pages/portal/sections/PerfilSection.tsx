import { useCallback, useEffect, useState } from 'react';
import BeltEmblem from './BeltEmblem';
import ImageUpload from '../../../components/ImageUpload';
import { useToast } from '../../../components/ToastContext';
import { trainingApi } from '../../../api/training';
import { usePlatform } from '../../../native/usePlatform';
import { tapLight } from '../../../native/haptics';
import {
  scheduleStreakReminders,
  getReminderPrefs,
  setReminderPrefs,
  type ReminderPrefs,
} from '../../../native/notifications';
import type { Student } from '../../../types';
import { computeAchievements, type Achievement } from '../achievements';
import { formatDate, Field } from './shared';
import { useThemeStore, THEME_OPTIONS } from '../theme';
import { isSoundEnabled, setSoundEnabled, playOss, isDuelSoundEnabled, setDuelSoundEnabled, playDuelo } from '../../../native/sound';

interface Props {
  student: Student;
  uploading: boolean;
  uploadProgress: number;
  onPhotoUpload: (file: File) => Promise<void>;
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${h.toString().padStart(2, '0')}:00`,
}));

/**
 * "Ajustes" — student-tweakable settings: the weekly training goal (objetivos) and
 * the daily motivation reminder (native only; toggle + hour). Lives in Perfil so it's
 * discoverable, instead of the easy-to-miss inline button on the Entreno card.
 */
function SettingsSection({ studentId }: { studentId: number }) {
  const { isNative } = usePlatform();
  const { toast } = useToast();
  const themePref = useThemeStore((s) => s.pref);
  const setThemePref = useThemeStore((s) => s.setPref);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [duelSoundOn, setDuelSoundOn] = useState(isDuelSoundEnabled());
  const [goal, setGoal] = useState<number | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [prefs, setPrefs] = useState<ReminderPrefs>(() => getReminderPrefs());

  useEffect(() => {
    trainingApi.getGoal().then(setGoal).catch(() => { /* leave unset */ });
  }, []);

  // Re-tailor the native reminders to the latest streak after a settings change.
  const reschedule = useCallback(async () => {
    if (!isNative) return;
    try {
      const [sum, list] = await Promise.all([trainingApi.summary(studentId), trainingApi.list(studentId)]);
      const trainedToday = list.some((s) => s.date === new Date().toLocaleDateString('en-CA'));
      await scheduleStreakReminders(sum.currentStreak, trainedToday, {
        lostStreak: sum.lostStreak,
        repairAvailable: sum.repairAvailable,
      });
    } catch {
      /* non-critical */
    }
  }, [isNative, studentId]);

  const changeGoal = async (n: number) => {
    setSavingGoal(true);
    try {
      const saved = await trainingApi.setGoal(n);
      setGoal(saved);
      void reschedule();
      toast.success('Meta semanal actualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar la meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const updatePrefs = (next: ReminderPrefs) => {
    setPrefs(next);
    setReminderPrefs(next);
    void reschedule();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h2 className="font-bold text-gray-900 mb-4">Ajustes</h2>

      {/* Weekly training goal */}
      <div>
        <p className="text-sm font-semibold text-gray-700">Meta semanal 🎯</p>
        <p className="text-xs text-gray-400 mb-2">¿Cuántas veces quieres entrenar por semana?</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              disabled={savingGoal}
              onClick={() => changeGoal(n)}
              className={`w-10 h-10 rounded-lg border-2 font-bold transition-colors disabled:opacity-50 ${
                n === goal ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance / theme picker */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-700">Apariencia 🎨</p>
        <p className="text-xs text-gray-400 mb-3">Elige el diseño del portal. Se guarda en este dispositivo.</p>
        <div className="space-y-2">
          {THEME_OPTIONS.map((opt) => {
            const active = themePref === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setThemePref(opt.key)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors text-left ${
                  active ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0 relative overflow-hidden"
                  style={{ background: opt.swatchBg }}
                >
                  <span className="absolute left-1.5 bottom-1.5 w-4 h-4 rounded" style={{ background: opt.swatchAccent }} />
                  {opt.swatchDot && (
                    <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-sm" style={{ background: opt.swatchDot }} />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800">{opt.label}</span>
                  <span className="block text-xs text-gray-400">{opt.desc}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 grid place-items-center ${
                    active ? 'border-primary-500' : 'border-gray-300'
                  }`}
                >
                  {active && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--acc, #FF5436)' }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sounds */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-700">Sonidos 🥋</p>
            <p className="text-xs text-gray-400">Un "oss" al registrar entreno o subir de grado.</p>
          </div>
          <button
            role="switch"
            aria-checked={soundOn}
            onClick={() => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); if (next) playOss(); }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${soundOn ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${soundOn ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Duel sound */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-700">Sonido de duelos ⚔️</p>
            <p className="text-xs text-gray-400">Un toque de sonido al enviar un reto a un compañero.</p>
          </div>
          <button
            role="switch"
            aria-checked={duelSoundOn}
            onClick={() => { const next = !duelSoundOn; setDuelSoundOn(next); setDuelSoundEnabled(next); if (next) playDuelo(); }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${duelSoundOn ? 'bg-primary-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${duelSoundOn ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Daily motivation reminder — native only (local notifications no-op on web) */}
      {isNative && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-700">Recordatorio diario 🔥</p>
              <p className="text-xs text-gray-400">Un aviso para mantener tu racha.</p>
            </div>
            <button
              role="switch"
              aria-checked={prefs.enabled}
              onClick={() => updatePrefs({ ...prefs, enabled: !prefs.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${prefs.enabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${prefs.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {prefs.enabled && (
            <div className="mt-3 flex items-center gap-2">
              <label htmlFor="reminder-hour" className="text-xs text-gray-500">Hora del recordatorio</label>
              <select
                id="reminder-hour"
                value={prefs.hour}
                onChange={(e) => updatePrefs({ ...prefs, hour: Number(e.target.value) })}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
              >
                {HOUR_LABELS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "Logros" — badge vitrina computed from the student's own journal. */
function AchievementsCard({ studentId }: { studentId: number }) {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  // Tapped badge → detail sheet (mobile has no hover, so a native `title` tooltip never shows).
  const [selected, setSelected] = useState<Achievement | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([trainingApi.list(studentId), trainingApi.summary(studentId)])
      .then(([sessions, summary]) => {
        if (alive) setAchievements(computeAchievements(sessions, summary));
      })
      .catch(() => { /* hide the card if the journal can't load */ });
    return () => { alive = false; };
  }, [studentId]);

  if (!achievements) return null;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold text-gray-900">Logros</h2>
        <span className="text-xs text-gray-400">{unlockedCount} de {achievements.length}</span>
      </div>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">Toca un logro para ver cómo conseguirlo</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {achievements.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.description}
            onClick={() => { void tapLight(); setSelected(a); }}
            className={`rounded-xl border p-3 text-center transition-transform active:scale-95 ${
              a.unlocked ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
            }`}
          >
            <div className={`text-3xl ${a.unlocked ? '' : 'grayscale opacity-40'}`}>{a.emoji}</div>
            <p className={`mt-1 text-xs font-semibold leading-tight ${a.unlocked ? 'text-gray-900' : 'text-gray-400'}`}>
              {a.title}
            </p>
            {a.unlocked ? (
              <p className="mt-0.5 text-[10px] text-amber-600 font-medium">✓ Desbloqueado</p>
            ) : (
              <>
                <div className="mt-1.5 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-400"
                    style={{ width: `${Math.round((a.current / a.target) * 100)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-gray-400">{a.current} / {a.target}</p>
              </>
            )}
          </button>
        ))}
      </div>

      {selected && <AchievementDetail a={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** Detail sheet for a tapped achievement: what it is, how to get it, and current progress. */
function AchievementDetail({ a, onClose }: { a: Achievement; onClose: () => void }) {
  const pct = Math.round((a.current / a.target) * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center jjp-pop">
        <button onClick={onClose} className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        <div className={`text-5xl ${a.unlocked ? '' : 'grayscale opacity-40'}`}>{a.emoji}</div>
        <h3 className="mt-2 text-lg font-extrabold text-gray-900">{a.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{a.description}</p>

        {a.unlocked ? (
          <p className="mt-4 inline-block rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-600">
            ✓ Desbloqueado
          </p>
        ) : (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              <span className="font-bold text-gray-800">{a.current}</span> / {a.target} {a.unit} · {pct}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Perfil" — student card, personal data and enrolled plans/professors. */
export default function PerfilSection({ student, uploading, uploadProgress, onPhotoUpload }: Props) {
  return (
    <>
      {/* Student card with editable photo */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-40" data-tour="photo">
            <ImageUpload
              value={student.photoUrl}
              onFile={onPhotoUpload}
              uploading={uploading}
              progress={uploadProgress}
              profile="profile"
              label="tu foto"
              aspect="portrait"
            />
            <p className="text-[10px] text-gray-400 text-center mt-1">Toca la foto para cambiarla</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {student.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {student.nickname && <p className="text-sm text-gray-500 mt-0.5">"{student.nickname}"</p>}
            {student.academyName && <p className="text-sm text-primary-600 mt-1">{student.academyName}</p>}
            {student.joinDate && (
              <p className="text-xs text-gray-400 mt-2">📅 Ingresó el {formatDate(student.joinDate)}</p>
            )}
            {(student.disciplineBelts ?? []).length > 0 && (
              <div className="mt-4 space-y-2.5" data-tour="cinturon">
                {student.disciplineBelts!.map((d) => (
                  <div key={d.disciplineId} className="flex items-center gap-3">
                    <BeltEmblem colorHex={d.beltColorHex ?? null} belt={d.belt} stripes={d.stripes} size={46} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {d.belt}{d.stripes ? ` · ${d.stripes}° grado` : ''}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{d.disciplineName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal data */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Mis datos</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="RUT" value={student.rut} />
          <Field label="Email" value={student.email} />
          <Field label="Teléfono" value={student.phone} />
          <Field label="Teléfono de emergencia" value={student.emergencyPhone} />
          <Field label="Edad" value={student.age != null ? `${student.age} años` : null} />
          <Field label="Peso" value={student.weight != null ? `${student.weight} kg` : null} />
          <Field label="Dirección" value={student.address} />
          <Field label="Grupo sanguíneo" value={student.bloodType} />
          <Field label="Previsión" value={student.healthInsuranceType} />
          <Field label="Institución de salud" value={student.healthInsuranceCompany} />
        </dl>
        {student.medicalNotes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Notas médicas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.medicalNotes}</p>
          </div>
        )}
      </div>

      {/* Badge vitrina */}
      <AchievementsCard studentId={student.id} />

      {/* Settings: weekly goal + daily reminder */}
      <SettingsSection studentId={student.id} />

      {/* Plans & professors */}
      {student.enrolledPlans && student.enrolledPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Planes y profesores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {student.enrolledPlans.map((plan) => (
              <div key={plan.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  {plan.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{plan.name}</p>
                  {plan.disciplineName && <p className="text-xs text-gray-500 mt-0.5">{plan.disciplineName}</p>}
                  {plan.professorName && <p className="text-xs text-gray-600 font-medium mt-1.5">Prof. {plan.professorName}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
