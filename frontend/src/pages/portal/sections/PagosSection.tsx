import { Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { Payment, PaymentOptions } from '../../../types';
import { portalApi } from '../../../api/portal';
import { formatDate, money, SkeletonRows, MONTHS } from './shared';
import { tapLight } from '../../../native/haptics';
import { startCheckout, checkoutOpensInPlace, onCheckoutReturn, rememberCheckoutView } from '../../../native/checkout';
import { primePaymentSound } from '../../../native/sound';
import { getPlatformInfo } from '../../../native/usePlatform';
import PaymentReceipt from './PaymentReceipt';

/** State of a pending online checkout (older backends don't send it: treat as in progress). */
const checkoutState = (p: Payment) =>
  p.status === 'PENDING_CONFIRMATION' ? (p.onlineState ?? 'IN_PROGRESS') : null;

interface Props {
  payments: Payment[];
  detailLoading: boolean;
  studentId: number;
  options: PaymentOptions | null;
  /** Reloads the payment list (used to pick up a gateway confirmation after returning from checkout). */
  onRefresh?: () => void;
  studentName: string;
  academyName?: string | null;
  /** Payment the student just paid (back from the checkout): scroll here and open its receipt once confirmed. */
  focusPaymentId?: number | null;
  onFocusHandled?: () => void;
}

/** "Mis pagos" — pay the monthly fee online (Khipu / Mercado Pago) plus the payment history. */
export default function PagosSection({ payments, detailLoading, studentId, options, onRefresh, studentName, academyName, focusPaymentId, onFocusHandled }: Props) {
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ payment: Payment; celebrate: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<number | null>(null);

  // Back from a checkout: bring "Mis pagos" into view, then open the receipt as soon as it's confirmed
  // (the list refreshes on its own while the checkout is in progress).
  useEffect(() => {
    if (!focusPaymentId) return;
    if (scrolledFor.current !== focusPaymentId) {
      scrolledFor.current = focusPaymentId;
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const paid = payments.find((p) => p.id === focusPaymentId && p.status !== 'PENDING_CONFIRMATION');
    if (paid) {
      setReceipt({ payment: paid, celebrate: true });
      onFocusHandled?.();
    }
  }, [focusPaymentId, payments, onFocusHandled]);

  // Back from the checkout in the native app (jjplatform://pagos): pull the fresh status right away.
  useEffect(() => (onRefresh ? onCheckoutReturn(onRefresh) : undefined), [onRefresh]);

  const hasPending = payments.some((p) => checkoutState(p) === 'IN_PROGRESS');

  // The gateway confirms through a webhook, so refresh when the student comes back to the app
  // and poll gently while a checkout is in progress (not once it expired or was rejected).
  useEffect(() => {
    if (!onRefresh) return;
    const onVisible = () => { if (document.visibilityState === 'visible') onRefresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = hasPending ? window.setInterval(onRefresh, 8000) : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [onRefresh, hasPending]);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentPaid = payments.some((p) => p.month === month && p.year === year && p.status !== 'PENDING_CONFIRMATION');
  const currentAttempt = payments.find((p) => p.month === month && p.year === year && p.status === 'PENDING_CONFIRMATION');
  const attemptState = currentAttempt ? checkoutState(currentAttempt) : null;
  const canPayOnline = !!options && (options.khipu || options.mercadoPago);

  const pay = async (method: string) => {
    void tapLight();
    // Inside the tap: remember the current portal view for the return and, when the portal stays
    // open behind the checkout (app / desktop tab), silently unlock audio for the success cue.
    if (!checkoutOpensInPlace()) primePaymentSound();
    rememberCheckoutView();
    setStarting(method);
    setError('');
    try {
      await startCheckout(() =>
        portalApi.pay(studentId, method, month, year, getPlatformInfo().isNative).then((r) => r.url));
    } catch (e: unknown) {
      // The API client already rejects with an Error carrying the backend's message.
      setError(e instanceof Error && e.message ? e.message : 'No se pudo iniciar el pago. Intenta de nuevo.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div ref={rootRef} className="bg-white rounded-xl shadow-sm" data-tour="pagos">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Mis pagos</h2>
        <p className="text-xs text-gray-400 mt-0.5">{payments.length} registro{payments.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Pay the current month online */}
      {(canPayOnline || (options?.bankDetails)) && (
        <div className="p-5 border-b border-gray-100 space-y-3">
          {currentPaid ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <Check weight="bold" size="1em" /> Tu mensualidad de {MONTHS[month - 1]} está al día.
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">Pagar mensualidad de {MONTHS[month - 1]} {year}</p>
              {attemptState === 'IN_PROGRESS' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Tienes un pago en proceso. Si ya pagaste, se confirmará en unos minutos. Si no lo terminaste o el banco mostró un error, puedes intentarlo de nuevo.
                </p>
              )}
              {attemptState === 'EXPIRED' && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Tu intento de pago anterior no se completó. Puedes intentarlo de nuevo.
                </p>
              )}
              {attemptState === 'REJECTED' && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Tu pago fue rechazado. Intenta de nuevo, con otra tarjeta o con otro medio de pago.
                </p>
              )}
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
              const attempt = checkoutState(pay);
              const isPending = attempt !== null;
              const pending = (pay.remaining ?? 0) > 0;
              return (
                <div
                  key={pay.id}
                  onClick={isPending ? undefined : () => setReceipt({ payment: pay, celebrate: false })}
                  role={isPending ? undefined : 'button'}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 ${isPending ? '' : 'cursor-pointer hover:bg-gray-100'}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{MONTHS[pay.month - 1]} {pay.year}</p>
                    {attempt === 'IN_PROGRESS' ? (
                      <p className="text-xs text-amber-600">Pago en proceso…</p>
                    ) : attempt === 'REJECTED' ? (
                      <p className="text-xs text-red-500">Pago rechazado</p>
                    ) : attempt === 'EXPIRED' ? (
                      <p className="text-xs text-gray-400">Pago no completado</p>
                    ) : pay.paidAt && (
                      <p className="text-xs text-gray-400">Pagado el {formatDate(pay.paidAt)}</p>
                    )}
                    {pay.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{pay.notes}"</p>}
                    {!isPending && <p className="text-xs text-primary-600 mt-0.5">Ver comprobante</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{money(pay.amount)}</p>
                    {attempt === 'IN_PROGRESS' ? (
                      <p className="text-xs text-amber-600">Pendiente</p>
                    ) : isPending ? (
                      <p className="text-xs text-red-500">Sin pagar</p>
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

      {receipt && (
        <PaymentReceipt
          payment={receipt.payment}
          celebrate={receipt.celebrate}
          studentName={studentName}
          academyName={academyName}
          academyWhatsapp={options?.whatsapp}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
