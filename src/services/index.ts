import baseFetch from './http';
import { PhotoItem, PagerResponse, PagerRequest } from '@/types';

export default class Service {
  static async getPhotos(params: PagerRequest) {
    return await baseFetch.get<PagerResponse<PhotoItem>>('/admin/photo', {
      params
    });
  }

  static async getPhotoDetail(id: number) {
    return await baseFetch.get<PhotoItem>(`/admin/photo/${id}`);
  }
}
