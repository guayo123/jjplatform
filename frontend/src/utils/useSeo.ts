import { useEffect } from 'react';
import type { SeoData } from '../../api/_seo';
import { jsonLdScript } from '../../api/_seo';

const MARK = 'data-seo';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  el.setAttribute(MARK, '1');
  document.head.appendChild(el);
}

/**
 * Aplica título, descripción, Open Graph, canonical y JSON-LD al <head> mientras el
 * componente está montado, y lo deja como estaba al desmontar. Pasar null no hace nada
 * (útil mientras carga la academia).
 */
export function useSeo(seo: SeoData | null) {
  useEffect(() => {
    if (!seo) return;
    const prevTitle = document.title;
    // Quita la descripción estática de index.html para no duplicarla.
    const staticDesc = document.head.querySelector('meta[name="description"]:not([data-seo])');
    const staticDescContent = staticDesc?.getAttribute('content') ?? null;
    staticDesc?.remove();

    const url = `${window.location.origin}${window.location.pathname}`;
    document.title = seo.title;
    setMeta('name', 'description', seo.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', 'es_CL');
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:card', seo.image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', seo.title);
    setMeta('name', 'twitter:description', seo.description);
    if (seo.image) {
      setMeta('property', 'og:image', seo.image);
      setMeta('name', 'twitter:image', seo.image);
    }

    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = url;
    canonical.setAttribute(MARK, '1');
    document.head.appendChild(canonical);

    if (seo.jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = jsonLdScript(seo.jsonLd);
      script.setAttribute(MARK, '1');
      document.head.appendChild(script);
    }

    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll(`[${MARK}]`).forEach((el) => el.remove());
      if (staticDescContent !== null) {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = staticDescContent;
        document.head.appendChild(meta);
      }
    };
  }, [seo]);
}
