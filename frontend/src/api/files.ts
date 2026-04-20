import client from './client';

export const filesApi = {
  upload: (file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    return client
      .post<{ url: string; filename: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deletePhoto: (id: number) =>
    client.delete(`/files/photos/${id}`).then((r) => r.data),
};
