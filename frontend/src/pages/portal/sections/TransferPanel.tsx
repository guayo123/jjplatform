import { Bank, Copy, Check, UploadSimple, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { portalApi } from '../../../api/portal';
import { shrinkImage } from '../../../utils/shrinkImage';
import { tapLight } from '../../../native/haptics';
import { money } from './shared';

interface Props {
  studentId: number;
  month: number;
  year: number;
  /** Total to transfer (null when unknown, e.g. no plan price). */
  amount: number | null;
  bankDetails: string;
  /** Several profiles covered by one transfer ("pagar todo"); omitted for a single month. */
  studentIds?: number[];
  /** Replacing a receipt already sent (in review or rejected). */
  replacing?: boolean;
  onClose: () => void;
  onSent: () => void;
}

const BTN_PRIMARY = 'bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60';

/**
 * Pay by bank transfer: shows the academy's bank details and the amount, then the student uploads a
 * photo / screenshot of the receipt. The academy confirms it from the admin panel.
 */
export default function TransferPanel({ studentId, month, year, amount, bankDetails, studentIds, replacing, onClose, onSent }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    setError('');
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Sube una foto o captura de pantalla del comprobante (no PDF).');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const copy = async () => {
    void tapLight();
    try {
      await navigator.clipboard.writeText(bankDetails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (old WebView / no permission): the text stays selectable.
    }
  };

  const send = async () => {
    if (!file) return;
    void tapLight();
    setSending(true);
    setError('');
    setProgress(0);
    try {
      const blob = await shrinkImage(file);
      await portalApi.submitTransfer(studentId, blob, month, year, studentIds, setProgress);
      onSent();
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo enviar el comprobante. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Bank size="1.1em" /> {replacing ? 'Enviar un nuevo comprobante' : 'Pagar por transferencia'}
        </p>
        <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1 -m-1">
          <X size="1em" />
        </button>
      </div>

      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
        <li>Transfiere {amount != null ? <strong className="text-gray-900">{money(amount)}</strong> : 'el monto de tu mensualidad'} a la cuenta de la academia.</li>
        <li>Sube la foto o captura del comprobante.</li>
        <li>La academia lo revisa y te avisamos cuando quede aprobado.</li>
      </ol>

      <div className="relative">
        <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-700 bg-white border border-gray-200 rounded-lg p-3 pr-20 select-text">{bankDetails}</pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md px-2 py-1"
        >
          {copied ? <><Check weight="bold" size="1em" /> Copiado</> : <><Copy size="1em" /> Copiar</>}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
      />
      {preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="Comprobante" className="w-16 h-16 object-cover rounded-lg border border-gray-200 bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-600 truncate">{file?.name}</p>
            <button onClick={() => inputRef.current?.click()} disabled={sending} className="text-xs text-primary-600 hover:underline">
              Cambiar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-primary-500 text-gray-500 hover:text-primary-600 rounded-lg py-4 text-sm font-medium transition-colors"
        >
          <UploadSimple size="1.2em" /> Subir comprobante
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button onClick={send} disabled={!file || sending} className={`w-full ${BTN_PRIMARY}`}>
        {sending ? (progress > 0 && progress < 100 ? `Enviando… ${progress}%` : 'Enviando…') : 'Enviar comprobante'}
      </button>
    </div>
  );
}
