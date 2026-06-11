# Portadas fotográficas del portal del alumno

Las portadas de catálogo son **vectoriales** (ver `src/pages/portal/portalBanners.tsx` →
`SCENIC_BANNERS` / `BannerArt`): se ven nítidas en cualquier pantalla y no pesan nada.
Las fotos anteriores se retiraron porque eran verticales y de baja resolución — en la franja
ancha del header se pixelaban y obligaban a un relleno borroso.

## Si quieres volver a ofrecer fotos

Deja el archivo aquí (Vite lo sirve como `/portadas/<nombre>`), agrégalo a `IMAGE_BANNERS`
(frontend) y añade la misma `key` en `PortalService.ALLOWED_BANNERS` (backend).

Requisitos para que se vea profesional:

- **Horizontal ~3:1** — p. ej. 1800×600 px o mayor. Nada vertical ni cuadrado.
- Nítida a ancho completo (pantallas con densidad 3x muestran ~2300 px de ancho).
- JPG o WebP, < 300 KB para que cargue rápido.
- La cabecera aplica un degradado oscuro abajo: prefiere imágenes con espacio/oscuridad
  en la parte inferior izquierda, donde va el nombre.
- Solo imágenes con licencia para uso comercial (evita personajes con copyright).

Si un archivo no existe, esa opción simplemente no se muestra en el selector (no rompe nada).
