import { useState } from 'react';
import { duelsAdminApi } from '../api/duelsAdmin';
import { useToast } from './ToastContext';

/**
 * Dashboard maintenance card: lets staff run the stale-duel sweep on demand instead of waiting
 * for the nightly 03:00 job. Expires accepted bouts left unresolved +5 days past their date.
 */
export default function DuelMaintenanceCard() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const { expired } = await duelsAdminApi.expireStale();
      toast.success(
        expired === 0
          ? 'No había duelos vencidos por limpiar.'
          : `${expired} duelo${expired !== 1 ? 's' : ''} vencido${expired !== 1 ? 's' : ''} marcado${expired !== 1 ? 's' : ''} como expirado${expired !== 1 ? 's' : ''}.`,
      );
    } catch {
      toast.error('No se pudo ejecutar la limpieza de duelos.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-900">Mantenimiento de duelos ⚔️</h3>
      <p className="text-xs text-gray-400 mt-0.5 mb-3">
        Expira los duelos aceptados que quedaron sin resolver más de 5 días después de su fecha
        pactada. El sistema también lo hace solo cada día a las 03:00.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="text-sm font-medium px-4 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {running ? 'Limpiando…' : 'Limpiar duelos vencidos'}
      </button>
    </div>
  );
}
