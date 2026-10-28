import { Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import type { Payment, PaymentOptions } from '../../../types';
import { portalApi, type FamilyDueRow } from '../../../api/portal';
import { formatDate, money, SkeletonRows, MONTHS } from './shared';
import { tapLight } from '../../../native/haptics';
import { startCheckout, checkoutOpensInPlace, onCheckoutReturn, rememberCheckoutView } from '../../../native/checkout';
import { primePaymentSound } from '../../../native/sound';
import { getPlatformInfo } from '../../../native/usePlatform';
import PaymentReceipt from './PaymentReceipt';
import TransferPanel from './TransferPanel';

// Pay buttons follow the portal theme: the main action takes the accent, the rest are outlined.
const BTN_PRIMARY = 'bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60';
const BTN_SECONDARY = 'border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60';

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
  /** This month's fee after the student's standing discount (shown before paying). */
  amountDue?: { total: number; discount: number; net: number; reason: string | null } | null;
}

/** A transfer receipt the academy hasn't approved yet, or rejected. */
const isTransfer = (p: Payment | undefined) => p?.method === 'TRANSFER';

/** "Mis pagos" — pay the monthly fee online (Khipu / Mercado Pago) or by transfer, plus the payment history. */
export default function PagosSection({ payments, detailLoading, studentId, options, onRefresh, studentName, academyName, focusPaymentId, onFocusHandled, amountDue }: Props) {
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorAll, setErrorAll] = useState('');
  const [receipt, setReceipt] = useState<{ payment: Payment; celebrate: boolean } | null>(null);
  /** Transfer panel open for this month ('one') or for every profile's month ('all'). */
  const [transferFor, setTransferFor] = useState<'one' | 'all' | null>(null);
  const [transferSent, setTransferSent] = useState(false);
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
  const bankDetails = options?.bankDetails?.trim() || null;
  const canTransfer = !!bankDetails && (options?.transfer ?? true);
  const canPay = canPayOnline || canTransfer;
  const transferAttempt = isTransfer(currentAttempt) ? attemptState : null;
  const inReview = transferAttempt === 'IN_REVIEW';

  // "Pagar todo": the month's unpaid fees of every profile this login pays for (e.g. a guardian and
  // their children). Re-read whenever the payments change, so a paid profile drops out of the list.
  const [familyDue, setFamilyDue] = useState<FamilyDueRow[]>([]);
  useEffect(() => {
    if (!canPay) return;
    let alive = true;
    portalApi.familyDue(studentId, month, year)
      .then((rows) => { if (alive) setFamilyDue(rows); })
      .catch(() => { if (alive) setFamilyDue([]); });
    return () => { alive = false; };
  }, [studentId, month, year, canPay, payments]);
  const familyTotal = familyDue.reduce((sum, r) => sum + Number(r.amount), 0);
  const showPayAll = canPay && familyDue.length >= 2;

  const openTransfer = (which: 'one' | 'all') => {
    void tapLight();
    setTransferSent(false);
    setTransferFor(which);
  };
  const onTransferSent = () => {
    setTransferFor(null);
    setTransferSent(true);
    onRefresh?.();
  };

  const pay = async (method: string, all = false) => {
    void tapLight();
    // Inside the tap: remember the current portal view for the return and, when the portal stays
    // open behind the checkout (app / desktop tab), silently unlock audio for the success cue.
    if (!checkoutOpensInPlace()) primePaymentSound();
    rememberCheckoutView();
    setStarting(all ? `ALL_${method}` : method);
    setError('');
    setErrorAll('');
    const app = getPlatformInfo().isNative;
    try {
      await startCheckout(() =>
        (all
          ? portalApi.payAll(studentId, familyDue.map((r) => r.studentId), method, month, year, app)
          : portalApi.pay(studentId, method, month, year, app)
        ).then((r) => r.url));
    } catch (e: unknown) {
      // The API client already rejects with an Error carrying the backend's message.
      (all ? setErrorAll : setError)(e instanceof Error && e.message ? e.message : 'No se pudo iniciar el pago. Intenta de nuevo.');
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

      {/* Pay every profile's month in one go (guardian + children) */}
      {showPayAll && (
        <div className="p-5 border-b border-gray-100">
         <div className="rounded-xl border border-primary-500 bg-primary-50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Pagar todo {MONTHS[month - 1]} en un solo pago</p>
            <p className="text-xs text-gray-500 mt-0.5">Una sola transferencia por las mensualidades pendientes de tu grupo.</p>
          </div>
          <div className="space-y-1 text-sm">
            {familyDue.map((r) => (
              <div key={r.studentId} className="text-gray-600">
                <div className="flex justify-between gap-3">
                  <span className="truncate">{r.name}</span>
                  <span>{money(Number(r.amount))}</span>
                </div>
                {r.planTotal != null && (
                  <p className="text-xs text-green-600">
                    {r.discountReason ?? 'Descuento'}: −{money(Number(r.planTotal) - Number(r.amount))} (antes {money(Number(r.planTotal))})
                  </p>
                )}
              </div>
            ))}
            <div className="flex justify-between gap-3 pt-1 border-t border-gray-200 font-bold text-gray-900">
              <span>Total</span>
              <span className="text-lg">{money(familyTotal)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {options?.khipu && (
              <button
                onClick={() => pay('KHIPU', true)}
                disabled={starting !== null}
                className={`flex-1 min-w-[140px] ${BTN_PRIMARY}`}
              >
                {starting === 'ALL_KHIPU' ? 'Abriendo…' : 'Pagar todo con Khipu'}
              </button>
            )}
            {options?.mercadoPago && (
              <button
                onClick={() => pay('MERCADO_PAGO', true)}
                disabled={starting !== null}
                className={`flex-1 min-w-[140px] ${options?.khipu ? BTN_SECONDARY : BTN_PRIMARY}`}
              >
                {starting === 'ALL_MERCADO_PAGO' ? 'Abriendo…' : 'Pagar todo con Mercado Pago'}
              </button>
            )}
            {canTransfer && transferFor !== 'all' && (
              <button
                onClick={() => openTransfer('all')}
                disabled={starting !== null}
                className={`flex-1 min-w-[140px] ${canPayOnline ? BTN_SECONDARY : BTN_PRIMARY}`}
              >
                Pagar todo por transferencia
              </button>
            )}
          </div>
          {transferFor === 'all' && bankDetails && (
            <TransferPanel
              studentId={studentId}
              month={month}
              year={year}
              amount={familyTotal}
              bankDetails={bankDetails}
              studentIds={familyDue.map((r) => r.studentId)}
              onClose={() => setTransferFor(null)}
              onSent={onTransferSent}
            />
          )}
          {errorAll && <p className="text-xs text-red-500">{errorAll}</p>}
         </div>
        </div>
      )}

      {/* Pay the current month online */}
      {canPay && (
        <div className="p-5 border-b border-gray-100 space-y-3">
          {currentPaid ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <Check weight="bold" size="1em" /> Tu mensualidad de {MONTHS[month - 1]} está al día.
            </div>
          ) : amountDue && amountDue.net <= 0 ? (
            // Full scholarship / 100% discount: nothing to pay online.
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <Check weight="bold" size="1em" /> Tu mensualidad está cubierta{amountDue.reason ? ` (${amountDue.reason})` : ''}.
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">Pagar mensualidad de {MONTHS[month - 1]} {year}</p>
              {amountDue && (
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-gray-500">
                    Monto a pagar
                    {amountDue.discount > 0 && (
                      <span className="block text-xs text-green-600">
                        {amountDue.reason ?? 'Descuento'}: −{money(amountDue.discount)} (antes {money(amountDue.total)})
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{money(amountDue.net)}</span>
                </div>
              )}
              {transferSent && inReview && (
                <p className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <Check weight="bold" size="1em" /> Comprobante enviado.
                </p>
              )}
              {inReview && (
                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                  Recibimos tu comprobante de transferencia. La academia lo está revisando y te avisaremos cuando quede aprobado.
                </p>
              )}
              {transferAttempt === 'REJECTED' && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  La academia no pudo validar tu transferencia{currentAttempt?.reviewNote ? `: ${currentAttempt.reviewNote}` : ''}. Envía el comprobante de nuevo o paga con otro medio.
                </p>
              )}
              {!transferAttempt && attemptState === 'IN_PROGRESS' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Tienes un pago en proceso. Si ya pagaste, se confirmará en unos minutos. Si no lo terminaste o el banco mostró un error, puedes intentarlo de nuevo.
                </p>
              )}
              {!transferAttempt && attemptState === 'EXPIRED' && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Tu intento de pago anterior no se completó. Puedes intentarlo de nuevo.
                </p>
              )}
              {!transferAttempt && attemptState === 'REJECTED' && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Tu pago fue rechazado. Intenta de nuevo, con otra tarjeta o con otro medio de pago.
                </p>
              )}
              {inReview ? (
                transferFor !== 'one' && canTransfer && (
                  <button onClick={() => openTransfer('one')} className="text-xs text-primary-600 hover:underline">
                    ¿Te equivocaste de imagen? Reemplazar comprobante
                  </button>
                )
              ) : canPay ? (
                <div className="flex flex-wrap gap-2">
                  {options?.khipu && (
                    <button
                      onClick={() => pay('KHIPU')}
                      disabled={starting !== null}
                      className={`flex-1 min-w-[140px] ${showPayAll ? BTN_SECONDARY : BTN_PRIMARY}`}
                    >
                      {starting === 'KHIPU' ? 'Abriendo…' : 'Pagar con Khipu'}
                    </button>
                  )}
                  {options?.mercadoPago && (
                    <button
                      onClick={() => pay('MERCADO_PAGO')}
                      disabled={starting !== null}
                      className={`flex-1 min-w-[140px] ${showPayAll || options?.khipu ? BTN_SECONDARY : BTN_PRIMARY}`}
                    >
                      {starting === 'MERCADO_PAGO' ? 'Abriendo…' : 'Pagar con Mercado Pago'}
                    </button>
                  )}
                  {canTransfer && transferFor !== 'one' && (
                    <button
                      onClick={() => openTransfer('one')}
                      disabled={starting !== null}
                      className={`flex-1 min-w-[140px] ${showPayAll || canPayOnline ? BTN_SECONDARY : BTN_PRIMARY}`}
                    >
                      Pagar por transferencia
                    </button>
                  )}
                </div>
              ) : null}
              {transferFor === 'one' && bankDetails && (
                <TransferPanel
                  studentId={studentId}
                  month={month}
                  year={year}
                  amount={amountDue ? amountDue.net : currentAttempt ? Number(currentAttempt.amount) : null}
                  bankDetails={bankDetails}
                  replacing={!!transferAttempt}
                  onClose={() => setTransferFor(null)}
                  onSent={onTransferSent}
                />
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
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
                    {attempt === 'IN_REVIEW' ? (
                      <p className="text-xs text-blue-600">Comprobante en revisión</p>
                    ) : attempt === 'REJECTED' && isTransfer(pay) ? (
                      <p className="text-xs text-red-500">Comprobante rechazado{pay.reviewNote ? `: ${pay.reviewNote}` : ''}</p>
                    ) : attempt === 'IN_PROGRESS' ? (
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
                    {attempt === 'IN_REVIEW' ? (
                      <p className="text-xs text-blue-600">En revisión</p>
                    ) : attempt === 'IN_PROGRESS' ? (
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
