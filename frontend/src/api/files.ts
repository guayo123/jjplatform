import client from './client';

export const filesApi = {
  upload: (file: File, captionOrGallery?: string | boolean, gallery = true) => {
    const formData = new FormData();
    formData.append('file', file);
    let caption: string | undefined;
    let isGallery = gallery;
    if (typeof captionOrGallery === 'boolean') {
      isGallery = captionOrGallery;
    } else {
      caption = captionOrGallery;
    }
    if (caption) formData.append('caption', caption);
    formData.append('gallery', String(isGallery));

    return client
      .post<{ url: string; filename: string }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deletePhoto: (id: number) =>
    client.delete(`/files/photos/${id}`).then((r) => r.data),
};
