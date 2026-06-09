import type { PromotionType } from '../../../types';

// Shared helpers and small presentational atoms used across the portal sections.
// Extracted verbatim from the original single-file Portal so web and the native
// tabbed layout render identically.

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const TYPE_CONFIG: Record<PromotionType, { icon: string; label: string; color: string }> = {
  PROMOCION:   { icon: '🏆', label: 'Promoción',   color: 'text-green-600' },
  DEGRADACION: { icon: '🔻', label: 'Degradación', color: 'text-red-500' },
  GRADO:       { icon: '⭐', label: 'Grado',        color: 'text-amber-500' },
};

export function formatDate(iso: string | null) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function money(n: number | null | undefined) {
  return n == null ? '—' : `$${n.toLocaleString('es-CL')}`;
}

export function BeltBadge({ belt, colorHex }: { belt: string; colorHex?: string | null }) {
  if (colorHex) {
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{ background: colorHex, color: lum < 0.45 ? '#FFF' : '#111827', borderColor: colorHex }}>
        {belt}
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-gray-100 text-gray-700 border-gray-200">
      {belt}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
