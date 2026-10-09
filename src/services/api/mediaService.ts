import apiClient from './apiClient';
import { ApiResponse } from '@city-market/shared';

export interface PickedImage {
  uri: string;
  type?: string;
  fileName?: string;
}

export const MediaService = {
  // Uploads an ID / license photo; media-service picks the storage path for couriers.
  uploadCourierDocument: async (image: PickedImage): Promise<string> => {
    const form = new FormData();
    form.append('file', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'document.jpg',
    } as any);
    form.append('folder', 'courier-documents');
    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      '/media/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 },
    );
    return response.data.data!.url;
  },
};
