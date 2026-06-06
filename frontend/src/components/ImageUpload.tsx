import { useRef, useState } from 'react';
import { describeProfile, validateImage, IMAGE_PROFILES, type ImageProfile } from '../config/imageUpload';

interface Props {
  value: string | null;
  onFile: (file: File) => Promise<void>;
  onRemove?: () => void;
  uploading?: boolean;
  /** Optional upload progress 0-100. When provided and uploading, renders a progress bar. */
  progress?: number;
  label?: string;
  aspect?: 'square' | 'portrait';
  /** When set, validates the file (format/size/dimensions) before invoking onFile. */
  profile?: ImageProfile;
}

export default function ImageUpload({
  value,
  onFile,
  onRemove,
  uploading = false,
  progress,
  label = 'imagen',
  aspect = 'square',
  profile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptAttr = profile ? IMAGE_PROFILES[profile].acceptMime.join(',') : 'image/*';
  const hint = profile ? describeProfile(profile) : 'JPG, PNG o WebP';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (profile) {
      try {
        await validateImage(file, profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Imagen inválida.');
        return;
      }
    } else if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      await onFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen.');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const showProgressBar = uploading && typeof progress === 'number';

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className={`relative overflow-hidden rounded-xl border border-gray-700 group ${aspect === 'portrait' ? 'aspect-[3/4] w-40' : 'w-32 h-32'}`}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-bold text-white bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cambiar
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Quitar
              </button>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <input ref={inputRef} type="file" accept={acceptAttr} onChange={onInputChange} className="hidden" />
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none
            ${dragging
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/60'
            }
            ${uploading ? 'cursor-wait opacity-70' : ''}
            ${aspect === 'portrait' ? 'aspect-[3/4] w-40' : 'h-32 w-full'}
          `}
        >
          {uploading ? (
            <div className="w-7 h-7 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className={`rounded-full flex items-center justify-center ${dragging ? 'bg-primary-500/20' : 'bg-gray-800'}`} style={{ width: 40, height: 40 }}>
                <svg className={`w-5 h-5 ${dragging ? 'text-primary-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center px-4">
                <p className={`text-xs font-semibold ${dragging ? 'text-primary-400' : 'text-gray-400'}`}>
                  {dragging ? 'Suelta aquí' : `Subir ${label}`}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept={acceptAttr} onChange={onInputChange} className="hidden" />
        </div>
      )}

      {showProgressBar && (
        <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
          <div className="bg-primary-500 h-1 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {profile && !value && !uploading && !error && (
        <p className="text-[10px] text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}
