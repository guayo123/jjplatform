import { useEffect, useState } from 'react';
import { filesApi } from '../../api/files';
import { useAuthStore } from '../../stores/authStore';
import { academiesApi } from '../../api/academies';
import type { Photo } from '../../types';

export default function Photos() {
  const academyId = useAuthStore((s) => s.academyId);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (academyId) {
      academiesApi.get(academyId).then((a) => setPhotos(a.photos));
    }
  }, [academyId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await filesApi.upload(file, caption || undefined);
      setPhotos((prev) => [{ id: Date.now(), url: result.url, caption }, ...prev]);
      setCaption('');
    } catch {
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Galería de Fotos</h1>

      {/* Upload form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-3">Subir nueva foto</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Descripción (opcional)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
          />
          <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors">
            {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500">No hay fotos. Sube la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm">
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="w-full h-full object-cover"
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
