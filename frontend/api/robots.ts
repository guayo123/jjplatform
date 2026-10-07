import { getHost } from './_common.js';

interface Res {
  setHeader(k: string, v: string): void;
  status(c: number): Res;
  send(b: string): void;
}

/** /robots.txt — apunta al sitemap del hostname desde el que se pide. */
export default function handler(req: { headers: Record<string, string | string[] | undefined> }, res: Res) {
  const host = getHost(req);
  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /admin\n` +
    `Disallow: /super\n` +
    `Disallow: /portal\n` +
    `Disallow: /login\n\n` +
    `Sitemap: https://${host}/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.status(200).send(body);
}
