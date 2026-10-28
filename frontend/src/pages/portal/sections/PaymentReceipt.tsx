import { Check, WhatsappLogo, ShareNetwork, Copy } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { Payment } from '../../../types';
import { money } from './shared';
import { openExternal } from '../../../native/checkout';
import { playPaymentSound } from '../../../native/sound';
import { notifySuccess } from '../../../native/haptics';
import { drawReceiptCard } from './receiptCard';
import { shareCard } from '../shareWeekCard';

const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const METHOD_LABEL: Record<string, string> = { KHIPU: 'Khipu', MERCADO_PAGO: 'Mercado Pago', TRANSFER: 'Transferencia' };

interface Props {
  payment: Payment;
  studentName: string;
  academyName?: string | null;
  /** Academy WhatsApp (any format); enables "Enviar a la academia". */
  academyWhatsapp?: string | null;
  /** Just paid (back from the checkout): success header, stamp animation, "oss" cue and haptic. */
  celebrate?: boolean;
  onClose: () => void;
}

/** "dd-mm-yyyy hh:mm" from the backend's ISO local date-time. */
function dateTime(iso: string | null): string {
  if (!iso) return '—';
  const [d, t] = iso.split('T');
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}${t ? ' ' + t.slice(0, 5) : ''}`;
}

/**
 * Payment receipt styled as a bank transfer ticket. Shareable by WhatsApp so the student can send
 * it to the academy. Opened automatically (celebrate) when coming back from a successful checkout,
 * and from any paid month in the history.
 */
export default function PaymentReceipt({ payment, studentName, academyName, academyWhatsapp, celebrate, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const period = `${MONTHS_LONG[payment.month - 1]} ${payment.year}`;
  const method = payment.method ? METHOD_LABEL[payment.method] ?? 'Registrado por la academia' : 'Registrado por la academia';
  const academy = academyName?.trim();

  useEffect(() => {
    if (!celebrate) return;
    playPaymentSound();
    void notifySuccess();
  }, [celebrate]);

  // Paid together with other months ("pagar todo"): one receipt for the whole transfer.
  const group = payment.groupItems && payment.groupItems.length > 1 ? payment.groupItems : null;
  const total = group ? Number(payment.groupTotal ?? payment.amount) : payment.amount;

  const discount = Number(payment.discount ?? 0);
  const discountValue = discount > 0 && payment.expectedAmount
    ? (payment.discountType === 'PERCENT' ? Math.round(payment.expectedAmount * discount / 100) : discount)
    : 0;
  // One line per student of a joint payment (with the discount it carried, if any).
  const itemRows: Array<[string, string]> = group
    ? group.flatMap((it): Array<[string, string]> => [
        [it.studentName, money(it.amount)],
        ...(Number(it.discountValue ?? 0) > 0
          ? [[`  ${it.discountReason || 'Descuento'}`, `−${money(Number(it.discountValue))}`] as [string, string]]
          : []),
      ])
    : [];
  const rows: Array<[string, string]> = [
    ...(group ? [] : [['Alumno', studentName] as [string, string]]),
    ['Mensualidad', period],
    ...(!group && discountValue > 0 ? [[payment.notes || 'Descuento', `−${money(discountValue)}`] as [string, string]] : []),
    ['Medio de pago', method],
    ['Fecha', dateTime(payment.paidAt)],
  ];
  if (payment.paidByEmail) rows.push(['Pagado por', payment.paidByGuardian ? `Apoderado (${payment.paidByEmail})` : payment.paidByEmail]);

  const text = [
    `Comprobante de pago${academy ? ` · ${academy}` : ''}`,
    `Monto: ${money(total)}`,
    ...itemRows.map(([k, v]) => `${k.trim()}: ${v}`),
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(payment.operationId ? [`N° operación: ${payment.operationId}`] : []),
  ].join('\n');
  const waDigits = academyWhatsapp?.replace(/\D/g, '') ?? '';

  const sendToAcademy = () => void openExternal(`https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`);
  // Shares the receipt as an image (phone share sheet → WhatsApp → the academy's chat or group).
  // Where files can't be shared (most desktops) the PNG is downloaded instead.
  const share = async () => {
    setSharing(true);
    setShareNote('');
    try {
      const canvas = drawReceiptCard({
        title: celebrate ? '¡Pago exitoso!' : 'Comprobante de pago',
        academyName: academy ?? null,
        amount: money(total),
        rows: [...itemRows, ...rows],
        operationId: payment.operationId ?? null,
      });
      const res = await shareCard(canvas, `comprobante-${payment.year}-${String(payment.month).padStart(2, '0')}.png`, 'Comprobante de pago');
      if (res === 'downloaded') setShareNote('Imagen descargada. Adjúntala en WhatsApp para enviarla.');
    } catch {
      setShareNote('No se pudo generar la imagen.');
    } finally {
      setSharing(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pt-safe pb-safe">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm jjp-pop">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header band */}
          <div className="relative bg-green-600 px-6 pt-7 pb-6 text-center text-white">
            <button onClick={onClose} className="absolute right-3 top-2 text-2xl leading-none text-white/70 hover:text-white" aria-label="Cerrar">×</button>
            <div className="relative mx-auto h-16 w-16">
              {celebrate && <span className="jjp-check-ripple absolute left-0 top-0 h-16 w-16 rounded-full bg-white/40" />}
              <span className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-600 ${celebrate ? 'jjp-check-stamp' : ''}`}>
                <Check weight="bold" size={34} />
              </span>
            </div>
            <h3 className="mt-3 text-xl font-extrabold">{celebrate ? '¡Pago exitoso!' : 'Comprobante de pago'}</h3>
            {academy && <p className="text-sm text-white/80">{academy}</p>}
          </div>

          {/* Amount */}
          <div className="px-6 pt-5 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-400">Monto pagado</p>
            <p className="text-3xl font-extrabold text-gray-900">{money(total)}</p>
            {group && <p className="text-xs text-gray-500 mt-0.5">Pago conjunto de {group.length} mensualidades</p>}
          </div>

          {/* Perforation */}
          <div className="relative my-4">
            <div className="mx-6 border-t-2 border-dashed border-gray-200" />
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-900/70" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-900/70" />
          </div>

          {/* Joint payment: what each student's month got (the one of this profile highlighted) */}
          {group && (
            <div className="mx-6 mb-3 rounded-lg border border-gray-100 px-3 py-2 space-y-1 text-sm">
              {group.map((it) => (
                <div key={it.studentId}>
                  <div className={`flex justify-between gap-4 ${it.studentId === payment.studentId ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                    <span className="truncate">{it.studentName}</span>
                    <span>{money(it.amount)}</span>
                  </div>
                  {Number(it.discountValue ?? 0) > 0 && (
                    <div className="flex justify-between gap-4 text-xs text-green-600">
                      <span className="truncate pl-3">{it.discountReason || 'Descuento'}</span>
                      <span>−{money(Number(it.discountValue))}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          <dl className="space-y-2 px-6 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-gray-500 flex-shrink-0">{k}</dt>
                <dd className="font-semibold text-gray-900 text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>
          {payment.operationId && (
            <div className="mx-6 mt-4 rounded-lg bg-gray-50 px-3 py-2 text-center">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">N° de operación</p>
              <p className="font-mono text-sm font-semibold text-gray-900 break-all">{payment.operationId}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 p-6 pt-5">
            <button onClick={() => void share()} disabled={sharing} className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              <ShareNetwork weight="bold" size="1.2em" /> {sharing ? 'Generando imagen…' : 'Compartir comprobante'}
            </button>
            {shareNote && <p className="text-center text-xs text-gray-500">{shareNote}</p>}
            <div className="flex gap-2">
              {waDigits && (
                <button onClick={sendToAcademy} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <WhatsappLogo weight="fill" size="1.1em" className="text-green-600" /> Texto a la academia
                </button>
              )}
              <button onClick={() => void copy()} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Copy size="1.1em" /> {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
