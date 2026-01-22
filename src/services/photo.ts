import baseFetch from './http';
import {
  PhotoItem,
  PagerResponse,
  PagerRequest,
  PhotoDetail,
  PhotoExif,
  PhotoLocation
} from '@/types';

export default class Service {
  static async getPhotos(params: PagerRequest) {
    return await baseFetch.get<PagerResponse<PhotoItem>>('/photos', {
      params
    });
  }

  static async getPhotoDetail(id: number) {
    return await baseFetch.get<PhotoDetail>(`/photos/${id}`);
  }

  static async getPhotoDetailBatch(ids: number[]) {
    return await baseFetch.post<PhotoDetail[]>(`/photos/batch`, {
      body: {
        ids
      }
    });
  }

  static async getPhotoExtendInfo(id: number) {
    return await baseFetch.get<PhotoExif>(`/photos/${id}/exif`);
  }

  static async getPhotoLocations() {
    return await baseFetch.get<PhotoLocation[]>('/photos/locations');
  }
}
