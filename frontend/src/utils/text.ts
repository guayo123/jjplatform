/** Minusculas y sin tildes/diacriticos, para buscar "maria" y encontrar "María". */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** True si `haystack` contiene `needle` ignorando mayusculas y tildes. */
export function textIncludes(haystack: string | null | undefined, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}
