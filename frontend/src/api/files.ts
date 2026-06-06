import client from './client';
import type { ImageProfile } from '../config/imageUpload';

export interface UploadOptions {
  caption?: string;
  gallery?: boolean;
  purpose?: ImageProfile;
  onProgress?: (pct: number) => void;
}

export const filesApi = {
  upload: (file: File, options: UploadOptions = {}) => {
    const { caption, gallery = true, purpose, onProgress } = options;
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    formData.append('gallery', String(gallery));
    if (purpose) formData.append('purpose', purpose);

    return client
      .post<{ url: string; filename: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  deletePhoto: (id: number) =>
    client.delete(`/files/photos/${id}`).then((r) => r.data),
};
