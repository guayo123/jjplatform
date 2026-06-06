# Portadas fotográficas del portal del alumno

Deja aquí las imágenes de portada (samurái / japonesas) que quieras ofrecer.
Vite las sirve desde la raíz del sitio, así que `samurai.jpg` queda en `/portadas/samurai.jpg`.

Archivos esperados (ver `src/pages/portal/portalBanners.tsx` → `IMAGE_BANNERS`):

| Archivo                       | Aparece como   |
| ----------------------------- | -------------- |
| `portadas/samuraiwarrior.png` | Samurái        |
| `portadas/mujer.png`          | Guerrera       |
| `portadas/mujer2.png`         | Guerrera 2     |
| `portadas/tiburon.png`        | Tiburón        |
| `portadas/tortugasninjas.png` | Tortugas Ninja |

Si un archivo no existe, esa opción simplemente no se muestra en el selector (no rompe nada).

## Recomendaciones
- Formato: JPG (o WebP) horizontal, ~1600×500 px, < 300 KB para que cargue rápido.
- La cabecera aplica un degradado oscuro abajo para que el texto se lea: prefiere imágenes
  con algo de espacio/oscuridad en la parte inferior izquierda.
- Usa imágenes con licencia para uso comercial (las pones tú para tener el control de la licencia).

Para agregar más opciones, añade el archivo aquí, una entrada en `IMAGE_BANNERS`
(frontend) y la misma `key` en `PortalService.ALLOWED_BANNERS` (backend).
