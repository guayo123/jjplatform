import { useEffect, useState } from 'react';
import { retentionApi } from '../api/retention';
import { useToast } from './ToastContext';
import type { AtRiskStudent } from '../types';

/** Dashboard panel listing students at risk of churn, with a manual WhatsApp reminder button. */
export default function AtRiskPanel() {
  const { toast } = useToast();
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState<number | null>(null);

  useEffect(() => {
    retentionApi.atRisk().then(setStudents).catch(() => setStudents([])).finally(() => setLoading(false));
  }, []);

  const remind = async (s: AtRiskStudent) => {
    setReminding(s.studentId);
    try {
      await retentionApi.remind(s.studentId);
      toast.success(`Recordatorio enviado a ${s.name.split(' ')[0]}`);
    } catch {
      toast.error('No se pudo enviar. Revisa el WhatsApp de la academia y el teléfono del alumno.');
    } finally {
      setReminding(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 flex justify-center">
        <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-2xl mb-1">✅</p>
        <p className="text-sm text-gray-500 font-medium">Sin alumnos en riesgo</p>
        <p className="text-xs text-gray-400 mt-0.5">Todos al día con su pago y entrenando.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Alumnos en riesgo</h3>
        <p className="text-xs text-gray-400 mt-0.5">{students.length} alumno{students.length !== 1 ? 's' : ''} sin pagar este mes o sin entrenar hace tiempo</p>
      </div>
      <div className="divide-y divide-gray-50">
        {students.map((s) => (
          <div key={s.studentId} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {s.overduePayment && (
                  <span className="text-[11px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Sin pago este mes</span>
                )}
                {s.inactive && (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    {s.daysSinceLastSession == null ? 'Nunca ha entrenado' : `Inactivo ${s.daysSinceLastSession} días`}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => remind(s)}
              disabled={reminding === s.studentId || !s.phone}
              title={!s.phone ? 'Sin teléfono registrado' : 'Enviar recordatorio por WhatsApp'}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {reminding === s.studentId ? 'Enviando…' : 'Recordar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
