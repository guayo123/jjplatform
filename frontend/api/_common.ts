/** Utilidades de las funciones de Vercel (el prefijo "_" evita exponerlas como endpoints). */
import { CUSTOM_DOMAINS } from './_seo.js';

export const API_BASE =
  process.env.API_BASE_URL || 'https://fantastic-success-production-b215.up.railway.app/api';

type Req = { headers: Record<string, string | string[] | undefined> };

/** Hostname real de la petición (Vercel lo entrega en x-forwarded-host), sin puerto. */
export function getHost(req: Req): string {
  const raw = req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
  const h = Array.isArray(raw) ? raw[0] : raw;
  return h.split(',')[0].trim().split(':')[0].toLowerCase();
}

/** Id de la academia dueña del hostname, si es un dominio propio. */
export function academyIdForHost(host: string): number | null {
  return CUSTOM_DOMAINS[host] ?? null;
}

export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
