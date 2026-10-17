"""
Genera los iconos y el manifest de la PWA de una academia con dominio propio.

Uso:  python scripts/make-academy-pwa.py <academyId>

Descarga el logo de la academia (API publica), lo centra sobre fondo blanco y escribe:
  public/icons/academy-<id>/{apple-touch-icon,icon-192,icon-512,icon-maskable-512}.png
  public/manifests/academy-<id>.webmanifest
Despues hay que agregar el hostname en vercel.json (rewrites /app.webmanifest y
/apple-touch-icon) y en api/_seo.ts (CUSTOM_DOMAINS).
"""
import io, json, os, sys, urllib.request
from PIL import Image

API = os.environ.get("API_BASE_URL", "https://fantastic-success-production-b215.up.railway.app/api")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

def main(academy_id: int):
    with urllib.request.urlopen(f"{API}/public/academies/{academy_id}") as r:
        academy = json.load(r)
    name, logo_url = academy["name"], academy.get("logoUrl")
    if not logo_url:
        sys.exit(f"{name}: no tiene logo; subir uno antes de generar la PWA")
    with urllib.request.urlopen(logo_url) as r:
        logo = Image.open(io.BytesIO(r.read())).convert("RGBA")

    def make(size: int, ratio: float) -> Image.Image:
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        target = int(size * ratio)
        scaled = logo.resize((target, target), Image.LANCZOS)
        canvas.alpha_composite(scaled, ((size - target) // 2, (size - target) // 2))
        return canvas.convert("RGB")

    out = os.path.join(ROOT, "public", "icons", f"academy-{academy_id}")
    os.makedirs(out, exist_ok=True)
    make(180, 0.92).save(os.path.join(out, "apple-touch-icon.png"), optimize=True)
    make(192, 0.92).save(os.path.join(out, "icon-192.png"), optimize=True)
    make(512, 0.92).save(os.path.join(out, "icon-512.png"), optimize=True)
    make(512, 0.66).save(os.path.join(out, "icon-maskable-512.png"), optimize=True)

    base = f"/icons/academy-{academy_id}"
    manifest = {
        "name": name,
        "short_name": name,
        "description": f"Portal de alumnos de {name}.",
        "lang": "es",
        "start_url": "/portal",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait",
        "background_color": "#030712",
        "theme_color": "#030712",
        "icons": [
            {"src": f"{base}/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": f"{base}/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": f"{base}/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    os.makedirs(os.path.join(ROOT, "public", "manifests"), exist_ok=True)
    with open(os.path.join(ROOT, "public", "manifests", f"academy-{academy_id}.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"OK: {name} -> {out}")

if __name__ == "__main__":
    main(int(sys.argv[1]))
