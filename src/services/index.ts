import baseFetch from './http';
import { Photo, PagerResponse } from '@/types';

export default class Service {
  static async getPhotos() {
    return await baseFetch.request<PagerResponse<Photo>>('/admin/photo');
  }
}
