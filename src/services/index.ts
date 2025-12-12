import baseFetch from './http';
import { PhotoItem, PagerResponse, PagerRequest } from '@/types';

export default class Service {
  static async getPhotos(params: PagerRequest) {
    return await baseFetch.get<PagerResponse<PhotoItem>>('/admin/photo', {
      params
    });
  }
}
