/** Strips dots, dashes and any separators; keeps digits and the verifier digit, upper-casing "K". */
export function cleanRut(value: string): string {
  return value.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Formats a Chilean RUT for display: thousands dots + dash before the verifier digit.
 * e.g. "12345678K" -> "12.345.678-K". Returns "" for empty input.
 */
export function formatRut(value: string): string {
  const clean = cleanRut(value);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean; // only the body so far, no verifier yet
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}
