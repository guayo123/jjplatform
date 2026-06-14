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

/** A single shimmering placeholder block. Sized via Tailwind (e.g. "h-4 w-1/2"). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`jjp-skeleton ${className}`} aria-hidden="true" />;
}

/** Card-shaped loading placeholder — shown instead of a spinner so the layout
 *  appears instantly and "fills in" as data arrives. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Bare shimmer rows (no card wrapper) — for loading states already inside a card. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Loading placeholder shaped like the training summary card (ring + stats). */
export function ProgressSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-5">
        <Skeleton className="!rounded-full w-[76px] h-[76px] flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
      </div>
    </div>
  );
}
