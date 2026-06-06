export type ImageProfile = 'logo' | 'profile' | 'gallery';

export interface ImageProfileSpec {
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  /** Accepted MIME types — also used for the file input's `accept` attribute. */
  acceptMime: string[];
  label: string;
}

/** Must stay in sync with backend ImageValidator.Profile. */
export const IMAGE_PROFILES: Record<ImageProfile, ImageProfileSpec> = {
  logo: {
    maxBytes: 1 * 1024 * 1024,
    minWidth: 100, minHeight: 100,
    maxWidth: 1024, maxHeight: 1024,
    acceptMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    label: 'Logo',
  },
  profile: {
    maxBytes: 2 * 1024 * 1024,
    minWidth: 200, minHeight: 200,
    maxWidth: 3000, maxHeight: 3000,
    acceptMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    label: 'Foto de perfil',
  },
  gallery: {
    maxBytes: 5 * 1024 * 1024,
    minWidth: 600, minHeight: 400,
    maxWidth: 4000, maxHeight: 4000,
    acceptMime: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    label: 'Foto de galería',
  },
};

export function describeProfile(p: ImageProfile): string {
  const s = IMAGE_PROFILES[p];
  const mb = (s.maxBytes / (1024 * 1024)).toFixed(0);
  return `JPG, PNG, GIF o WebP · máx ${mb} MB · entre ${s.minWidth}×${s.minHeight} y ${s.maxWidth}×${s.maxHeight} px`;
}

/** Reads the image to verify it's decodable and within the profile's dimension bounds. */
export function validateImage(file: File, profile: ImageProfile): Promise<void> {
  const spec = IMAGE_PROFILES[profile];

  if (!spec.acceptMime.includes(file.type)) {
    return Promise.reject(new Error('Formato no permitido. Usa JPG, PNG, GIF o WebP.'));
  }
  if (file.size > spec.maxBytes) {
    const mb = (spec.maxBytes / (1024 * 1024)).toFixed(0);
    return Promise.reject(new Error(`La imagen supera el peso máximo (${mb} MB).`));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w < spec.minWidth || h < spec.minHeight) {
        reject(new Error(`Imagen demasiado pequeña: ${w}×${h}. Mínimo ${spec.minWidth}×${spec.minHeight} px.`));
      } else if (w > spec.maxWidth || h > spec.maxHeight) {
        reject(new Error(`Imagen demasiado grande: ${w}×${h}. Máximo ${spec.maxWidth}×${spec.maxHeight} px.`));
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen. ¿Está corrupta?'));
    };
    img.src = url;
  });
}
