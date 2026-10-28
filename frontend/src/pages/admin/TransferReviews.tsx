import { Bank, Check, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { paymentsApi } from '../../api/payments';
import { formatCLP } from '../../utils/format';
import type { TransferReview } from '../../types';
import FormInput from '../../components/FormInput';
import { useTransferReviewStore } from '../../stores/transferReviewStore';

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const REJECT_REASONS = [
  'No encontramos la transferencia en la cuenta',
  'El monto no coincide',
  'La imagen no se ve bien',
];

function parseCLP(s: string): number {
  const n = Number(s.replace(/\./g, '').trim());
  return isNaN(n) ? 0 : n;
}

function toCLPDisplay(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function submittedLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  /** Called after a receipt is approved, so the month's payments reload. */
  onChanged: () => void;
  /** Receives the queue every time it loads (the page marks those months as "en revisión"). */
  onLoaded?: (reviews: TransferReview[]) => void;
}

/**
 * Transfer receipts sent by students / guardians from the portal, waiting for staff to check their bank:
 * approve (the month becomes paid, the payer gets the receipt) or reject with a reason.
 */
export default function TransferReviews({ onChanged, onLoaded }: Props) {
  const [reviews, setReviews] = useState<TransferReview[]>([]);
  const [zoom, setZoom] = useState<string | null>(null);
  const [approving, setApproving] = useState<TransferReview | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [rejecting, setRejecting] = useState<TransferReview | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    paymentsApi.pendingTransfers()
      .then((r) => { setReviews(r); onLoaded?.(r); useTransferReviewStore.getState().setCount(r.length); })
      .catch(() => setReviews([]));
  }, [onLoaded]);
  useEffect(() => { load(); }, [load]);

  const close = () => {
    setApproving(null);
    setRejecting(null);
    setReason('');
    setError('');
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      close();
      load();
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    if (!approving) return;
    const single = approving.items.length === 1;
    const amount = single ? parseCLP(amountInput) : undefined;
    const partial = single && amount != null && amount !== Number(approving.total) ? amount : undefined;
    return run(() => paymentsApi.approveTransfer(approving.paymentId, partial));
  };

  const reject = () => {
    if (!rejecting) return;
    return run(() => paymentsApi.rejectTransfer(rejecting.paymentId, reason.trim()));
  };

  if (reviews.length === 0) return null;

  return (
    <div id="transferencias-por-revisar" className="bg-white rounded-xl shadow-sm p-5 mb-6 border-l-4 border-blue-500 scroll-mt-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Bank size="1.1em" className="text-blue-600" />
        Transferencias por revisar
        <span className="rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5">{reviews.length}</span>
      </h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Revisa en tu banco que haya llegado cada transferencia y apruébala. El mes queda pagado y el alumno recibe su comprobante.
      </p>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.paymentId} className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-gray-200">
           <div className="flex gap-3 min-w-0 flex-1">
            {r.proofUrl && (
              <button
                onClick={() => setZoom(r.proofUrl)}
                className="flex-shrink-0 self-start"
                title="Ver comprobante"
              >
                <img src={r.proofUrl} alt="Comprobante" className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-md border border-gray-200 bg-gray-50" />
                <span className="block text-[11px] text-primary-600 mt-0.5">Ampliar</span>
              </button>
            )}
            <div className="min-w-0 flex-1 text-sm">
              {r.items.map((it) => (
                <div key={it.paymentId} className="flex justify-between gap-3">
                  <span className="font-medium min-w-0 break-words">
                    {it.studentName} <span className="text-gray-400 font-normal whitespace-nowrap">· {MONTH_NAMES[it.month - 1]} {it.year}</span>
                  </span>
                  <span className="text-gray-700 whitespace-nowrap">{formatCLP(Number(it.amount))}</span>
                </div>
              ))}
              {r.items.length > 1 && (
                <div className="flex justify-between gap-3 border-t border-gray-100 mt-1 pt-1 font-semibold">
                  <span>Total transferido</span>
                  <span>{formatCLP(Number(r.total))}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1.5 break-words">
                {r.payerEmail ? `Enviado por ${r.payerEmail}${r.payerGuardian ? ' (apoderado)' : ''}` : 'Enviado'}
                {r.submittedAt ? ` · ${submittedLabel(r.submittedAt)}` : ''}
              </p>
            </div>
           </div>
            <div className="flex sm:flex-col gap-2 sm:w-32 flex-shrink-0">
              <button
                onClick={() => { setApproving(r); setAmountInput(toCLPDisplay(Number(r.total))); }}
                className="flex-1 inline-flex items-center justify-center gap-1 min-h-[40px] rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              >
                <Check weight="bold" size="1em" /> Aprobar
              </button>
              <button
                onClick={() => setRejecting(r)}
                className="flex-1 inline-flex items-center justify-center gap-1 min-h-[40px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold"
              >
                <X weight="bold" size="1em" /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full-size receipt */}
      {zoom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Comprobante" className="max-h-full max-w-full rounded-lg" />
          <a
            href={zoom}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 bg-white/90 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            Abrir original
          </a>
        </div>
      )}

      {/* Approve */}
      {approving && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-white">Aprobar transferencia</h2>
            <p className="text-sm text-gray-400">
              {approving.items.length > 1
                ? `Se marcarán pagadas ${approving.items.length} mensualidades por ${formatCLP(Number(approving.total))}.`
                : `${approving.items[0].studentName} · ${MONTH_NAMES[approving.items[0].month - 1]} ${approving.items[0].year}`}
            </p>
            {approving.items.length === 1 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Monto recibido</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
                  <FormInput
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="pl-6"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Si llegó menos, escribe lo recibido: el resto queda como saldo pendiente.</p>
              </div>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button onClick={approve} disabled={busy} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Guardando…' : 'Aprobar'}
              </button>
              <button onClick={close} className="border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-white">Rechazar comprobante</h2>
            <p className="text-sm text-gray-400">El alumno verá el motivo y podrá enviarlo de nuevo o pagar con otro medio.</p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-xs rounded-full px-3 py-1 border ${reason === r ? 'border-primary-500 text-primary-300 bg-primary-500/10' : 'border-gray-700 text-gray-400 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <FormInput
              type="text"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (opcional)"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button onClick={reject} disabled={busy} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {busy ? 'Guardando…' : 'Rechazar'}
              </button>
              <button onClick={close} className="border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
