import { useEffect, useRef, useState } from 'react';
import { filesApi } from '../../api/files';
import { useAuthStore } from '../../stores/authStore';
import { academiesApi } from '../../api/academies';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import type { Photo } from '../../types';
import FormInput from '../../components/FormInput';

export default function Photos() {
  const academyId = useAuthStore((s) => s.academyId);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (academyId) {
      academiesApi.get(academyId).then((a) => setPhotos(a.photos));
    }
  }, [academyId]);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const result = await filesApi.upload(file, caption || undefined);
      setPhotos((prev) => [{ id: Date.now(), url: result.url, caption }, ...prev]);
      setCaption('');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await uploadFile(file);
  };

  const handleDelete = async (photo: Photo) => {
    const ok = await confirm({
      message: '¿Quitar esta foto de la galería?',
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(photo.id);
    try {
      await filesApi.deletePhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch {
      toast.error('Error al quitar la foto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Galería de Fotos</h1>

      {/* Upload zone */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
        <h2 className="font-bold text-white">Subir nueva foto</h2>

        <FormInput
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Descripción de la foto (opcional)"
        />

        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!uploading) uploadFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all h-36 select-none
            ${dragging ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/40'}
            ${uploading ? 'cursor-wait opacity-60' : ''}
          `}
        >
          {uploading ? (
            <div className="w-7 h-7 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dragging ? 'bg-primary-500/20' : 'bg-gray-800'}`}>
                <svg className={`w-5 h-5 ${dragging ? 'text-primary-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${dragging ? 'text-primary-400' : 'text-gray-400'}`}>
                  {dragging ? 'Suelta aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">JPG, PNG o WebP</p>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
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
              <button
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
                className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
                title="Quitar foto"
              >
                {deletingId === photo.id ? '…' : '×'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
