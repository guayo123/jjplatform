import { useState } from 'react';
import type { Payment, PaymentOptions } from '../../../types';
import { portalApi } from '../../../api/portal';
import { formatDate, money, SkeletonRows, MONTHS } from './shared';
import { tapLight } from '../../../native/haptics';

interface Props {
  payments: Payment[];
  detailLoading: boolean;
  studentId: number;
  options: PaymentOptions | null;
}

/** "Mis pagos" — pay the monthly fee online (Khipu / Mercado Pago) plus the payment history. */
export default function PagosSection({ payments, detailLoading, studentId, options }: Props) {
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentPaid = payments.some((p) => p.month === month && p.year === year && p.status !== 'PENDING_CONFIRMATION');
  const canPayOnline = !!options && (options.khipu || options.mercadoPago);

  const pay = async (method: string) => {
    void tapLight();
    setStarting(method);
    setError('');
    try {
      const { url } = await portalApi.pay(studentId, method, month, year);
      // Open the gateway checkout. _blank works on web; on native it hands off to the system browser.
      window.open(url, '_blank');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'No se pudo iniciar el pago. Intenta de nuevo.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm" data-tour="pagos">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Mis pagos</h2>
        <p className="text-xs text-gray-400 mt-0.5">{payments.length} registro{payments.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Pay the current month online */}
      {(canPayOnline || (options?.bankDetails)) && (
        <div className="p-5 border-b border-gray-100 space-y-3">
          {currentPaid ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <span>✓</span> Tu mensualidad de {MONTHS[month - 1]} está al día.
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">Pagar mensualidad de {MONTHS[month - 1]} {year}</p>
              {canPayOnline ? (
                <div className="flex flex-wrap gap-2">
                  {options?.khipu && (
                    <button
                      onClick={() => pay('KHIPU')}
                      disabled={starting !== null}
                      className="flex-1 min-w-[140px] bg-[#0070E0] hover:bg-[#0059b3] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {starting === 'KHIPU' ? 'Abriendo…' : 'Pagar con Khipu'}
                    </button>
                  )}
                  {options?.mercadoPago && (
                    <button
                      onClick={() => pay('MERCADO_PAGO')}
                      disabled={starting !== null}
                      className="flex-1 min-w-[140px] bg-[#009EE3] hover:bg-[#0085c2] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {starting === 'MERCADO_PAGO' ? 'Abriendo…' : 'Pagar con Mercado Pago'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">El pago en línea no está habilitado en tu academia.</p>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}

          {options?.bankDetails && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Datos para transferencia</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{options.bankDetails}</pre>
            </details>
          )}
        </div>
      )}

      <div className="p-5">
        {detailLoading ? (
          <SkeletonRows rows={4} />
        ) : payments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map((pay) => {
              const isPending = pay.status === 'PENDING_CONFIRMATION';
              const pending = (pay.remaining ?? 0) > 0;
              return (
                <div key={pay.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{MONTHS[pay.month - 1]} {pay.year}</p>
                    {isPending ? (
                      <p className="text-xs text-amber-600">Pago en proceso…</p>
                    ) : pay.paidAt && (
                      <p className="text-xs text-gray-400">Pagado el {formatDate(pay.paidAt)}</p>
                    )}
                    {pay.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{pay.notes}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{money(pay.amount)}</p>
                    {isPending ? (
                      <p className="text-xs text-amber-600">Pendiente</p>
                    ) : pending ? (
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
