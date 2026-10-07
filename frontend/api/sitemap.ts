import { getHost, academyIdForHost, fetchJson } from './_common.js';

interface Res {
  setHeader(k: string, v: string): void;
  status(c: number): Res;
  send(b: string): void;
}

/** /sitemap.xml — dinámico: lista el perfil de cada academia activa. */
export default async function handler(req: { headers: Record<string, string | string[] | undefined> }, res: Res) {
  const host = getHost(req);
  const origin = `https://${host}`;
  let paths: string[];

  if (academyIdForHost(host) !== null) {
    // Dominio propio: el sitio es solo la academia, en "/".
    paths = ['/'];
  } else {
    const academies = (await fetchJson<{ id: number }[]>('/public/academies')) ?? [];
    paths = ['/', ...academies.map((a) => `/academies/${a.id}`)];
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
