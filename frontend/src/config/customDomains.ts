import { CUSTOM_DOMAINS } from '../../api/_seo';

/**
 * Dominios propios de academias (el mapa vive en api/_seo.ts para compartirlo con las
 * funciones de Vercel). Si el sitio se abre desde uno de esos hostnames, "/" muestra
 * directamente el perfil de esa academia en vez del listado de la plataforma.
 */

/** ID de academia asociado al hostname actual, o null en la plataforma normal. */
export function getCustomDomainAcademyId(): number | null {
  if (typeof window === 'undefined') return null;
  return CUSTOM_DOMAINS[window.location.hostname.toLowerCase()] ?? null;
}
