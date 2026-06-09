import type { Payment } from '../../../types';
import { formatDate, money, Spinner, MONTHS } from './shared';

interface Props {
  payments: Payment[];
  detailLoading: boolean;
}

/** "Mis pagos" — payment history with outstanding balance per month. */
export default function PagosSection({ payments, detailLoading }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm" data-tour="pagos">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Mis pagos</h2>
        <p className="text-xs text-gray-400 mt-0.5">{payments.length} registro{payments.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-5">
        {detailLoading ? (
          <Spinner />
        ) : payments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map((pay) => {
              const pending = (pay.remaining ?? 0) > 0;
              return (
                <div key={pay.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{MONTHS[pay.month - 1]} {pay.year}</p>
                    {pay.paidAt && <p className="text-xs text-gray-400">Pagado el {formatDate(pay.paidAt)}</p>}
                    {pay.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{pay.notes}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{money(pay.amount)}</p>
                    {pending ? (
                      <p className="text-xs text-red-500">Saldo {money(pay.remaining)}</p>
                    ) : (
                      <p className="text-xs text-green-600">Al día</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
