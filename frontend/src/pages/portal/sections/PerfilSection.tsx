import { useCallback, useEffect, useState } from 'react';
import BeltImage from '../../../components/BeltImage';
import ImageUpload from '../../../components/ImageUpload';
import { useToast } from '../../../components/ToastContext';
import { trainingApi } from '../../../api/training';
import { usePlatform } from '../../../native/usePlatform';
import {
  scheduleStreakReminders,
  getReminderPrefs,
  setReminderPrefs,
  type ReminderPrefs,
} from '../../../native/notifications';
import type { Student } from '../../../types';
import { formatDate, Field } from './shared';

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
              <div className="mt-4 space-y-2" data-tour="cinturon">
                {student.disciplineBelts!.map((d) => (
                  <div key={d.disciplineId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0 truncate">{d.disciplineName}</span>
                    <BeltImage belt={d.belt} stripes={d.stripes} colorHex={d.beltColorHex ?? undefined} className="max-w-[180px]" />
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
