/**
 * Lógica SEO compartida entre la web (React, src/) y las funciones de Vercel (api/).
 * Es TypeScript puro, sin dependencias del navegador. El prefijo "_" evita que Vercel
 * lo exponga como endpoint.
 */

/** Dominios propios de academias (hostname → id de academia). Ver config/customDomains. */
export const CUSTOM_DOMAINS: Record<string, number> = {
  'jiujitsupuentealto.cl': 2,
  'www.jiujitsupuentealto.cl': 2,
};

export const PLATFORM_NAME = 'JJPlatform';
export const PLATFORM_TITLE = 'JJPlatform — Academias de Jiu-Jitsu y artes marciales en Chile';
export const PLATFORM_DESCRIPTION =
  'Encuentra academias de Jiu-Jitsu y artes marciales en Chile: horarios, planes, profesores y fotos. Compara y contacta directamente a cada academia.';

/** Subconjunto de AcademyPublic que usa el SEO (AcademyPublic lo cumple estructuralmente). */
export interface SeoAcademy {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  instagram: string | null;
  schedules: { dayOfWeek: string; startTime: string; endTime: string }[];
  photos: { url: string }[];
  plans: { name: string; price: number; active?: boolean }[];
}

export interface SeoData {
  title: string;
  description: string;
  image: string | null;
  jsonLd: Record<string, unknown> | null;
}

const DAYS_EN: Record<string, string> = {
  lunes: 'Monday',
  martes: 'Tuesday',
  miércoles: 'Wednesday',
  miercoles: 'Wednesday',
  jueves: 'Thursday',
  viernes: 'Friday',
  sábado: 'Saturday',
  sabado: 'Saturday',
  domingo: 'Sunday',
};

/** Recorta a ~max caracteres sin cortar palabras. */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length).replace(/[.,;:\s]+$/, '') + '…';
}

function instagramUrl(handle: string): string {
  const h = handle.trim();
  return /^https?:\/\//i.test(h) ? h : `https://instagram.com/${h.replace(/^@/, '')}`;
}

/** Título, descripción, imagen y datos estructurados (schema.org) de una academia. */
export function buildAcademySeo(academy: SeoAcademy, url: string): SeoData {
  const title = `${academy.name} — Academia de artes marciales`;

  const base = academy.description?.trim()
    ? academy.description
    : `${academy.name}: academia de artes marciales. Revisa horarios de clases, planes y tarifas, profesores y fotos.`;
  const withAddress = academy.address && !base.includes(academy.address) ? `${base} ${academy.address}` : base;
  const description = truncate(withAddress, 158);

  const images = [...academy.photos.map((p) => p.url), ...(academy.logoUrl ? [academy.logoUrl] : [])].filter(Boolean);
  const image = images[0] ?? null;

  // Horarios: un OpeningHoursSpecification por día+franja única.
  const seen = new Set<string>();
  const openingHoursSpecification = academy.schedules.flatMap((s) => {
    const day = DAYS_EN[s.dayOfWeek.trim().toLowerCase()];
    if (!day) return [];
    const opens = s.startTime.slice(0, 5);
    const closes = s.endTime.slice(0, 5);
    const key = `${day}|${opens}|${closes}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: day, opens, closes }];
  });

  const offers = academy.plans
    .filter((p) => p.active !== false && p.price > 0)
    .map((p) => ({
      '@type': 'Offer',
      name: p.name,
      price: p.price,
      priceCurrency: 'CLP',
    }));

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: academy.name,
    description,
    url,
    ...(images.length > 0 && { image: images.slice(0, 6) }),
    ...(academy.logoUrl && { logo: academy.logoUrl }),
    ...(academy.phone && { telephone: academy.phone }),
    ...(academy.address && {
      address: { '@type': 'PostalAddress', streetAddress: academy.address, addressCountry: 'CL' },
    }),
    ...(academy.instagram && { sameAs: [instagramUrl(academy.instagram)] }),
    ...(openingHoursSpecification.length > 0 && { openingHoursSpecification }),
    ...(offers.length > 0 && { makesOffer: offers }),
  };

  return { title, description, image, jsonLd };
}

/** Torneo tal como lo entrega la API pública (con nombres ya abreviados). */
export interface SeoTournament {
  name: string;
  date: string;
  status: string;
  participants: unknown[];
  championName?: string | null;
}

/** Título y descripción propios de un torneo (enlace compartido ?torneo=ID); conserva imagen y JSON-LD de la academia. */
export function buildTournamentSeo(base: SeoData, academyName: string, t: SeoTournament): SeoData {
  const d = new Date(`${t.date}T00:00:00`);
  const date = Number.isNaN(d.getTime())
    ? t.date
    : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const count = `${t.participants.length} participante${t.participants.length === 1 ? '' : 's'}`;
  const lead =
    t.status === 'COMPLETED' && t.championName
      ? `🏆 Campeón: ${t.championName}. ${count} · ${date}.`
      : `${count} · ${date}.`;
  return {
    ...base,
    title: `${t.name} — ${academyName}`,
    description: `${lead} Mira el bracket y los resultados.`,
  };
}

/** SEO de la portada de la plataforma (listado de academias). */
export function buildPlatformSeo(url: string): SeoData {
  return {
    title: PLATFORM_TITLE,
    description: PLATFORM_DESCRIPTION,
    image: null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: PLATFORM_NAME,
      url,
      inLanguage: 'es-CL',
    },
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON-LD seguro para incrustar en un <script>. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** HTML mínimo con las etiquetas de cabecera, para bots de vistas previas (WhatsApp, etc.). */
export function renderMetaHtml(seo: SeoData, url: string): string {
  const t = escapeHtml(seo.title);
  const d = escapeHtml(seo.description);
  const u = escapeHtml(url);
  const img = seo.image ? escapeHtml(seo.image) : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CL">
<meta property="og:site_name" content="${PLATFORM_NAME}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
${img ? `<meta property="og:image" content="${img}">\n` : ''}<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
${img ? `<meta name="twitter:image" content="${img}">\n` : ''}${seo.jsonLd ? `<script type="application/ld+json">${jsonLdScript(seo.jsonLd)}</script>\n` : ''}</head>
<body><h1>${t}</h1><p>${d}</p></body>
</html>`;
}
