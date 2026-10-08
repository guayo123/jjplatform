import { getHost, academyIdForHost, fetchJson } from './_common.js';
import {
  buildAcademySeo,
  buildPlatformSeo,
  buildTournamentSeo,
  renderMetaHtml,
  type SeoAcademy,
  type SeoTournament,
} from './_seo.js';

interface Res {
  setHeader(k: string, v: string): void;
  status(c: number): Res;
  send(b: string): void;
}

/**
 * Vista previa para bots de redes (WhatsApp, Facebook, Telegram…), que no ejecutan JavaScript:
 * vercel.json les reenvía aquí /academies/:id y "/" para que reciban título, descripción e
 * imagen de la academia. Las personas y Google reciben la SPA normal.
 */
export default async function handler(
  req: { headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[] | undefined> },
  res: Res,
) {
  const host = getHost(req);
  const rawId = req.query?.id;
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId) || academyIdForHost(host);

  const rawTorneo = req.query?.torneo;
  const torneoId = Number(Array.isArray(rawTorneo) ? rawTorneo[0] : rawTorneo) || null;

  const isCustom = academyIdForHost(host) !== null;
  const base = isCustom ? `https://${host}/` : id ? `https://${host}/academies/${id}` : `https://${host}/`;
  const url = torneoId && id ? `${base}?torneo=${torneoId}` : base;

  const academy = id ? await fetchJson<SeoAcademy>(`/public/academies/${id}`) : null;
  let seo = academy ? buildAcademySeo(academy, url) : buildPlatformSeo(url);
  if (academy && torneoId) {
    const tournament = await fetchJson<SeoTournament>(`/public/academies/${id}/tournaments/${torneoId}`);
    if (tournament) seo = buildTournamentSeo(seo, academy.name, tournament);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(200).send(renderMetaHtml(seo, url));
}
