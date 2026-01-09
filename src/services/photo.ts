import baseFetch from './http';
import {
  PhotoItem,
  PagerResponse,
  PagerRequest,
  PhotoDetail,
  ExifType,
  CommonResponse,
  ExifData
} from '@/types';

export default class Service {
  static async getPhotos(params: PagerRequest) {
    return await baseFetch.get<PagerResponse<PhotoItem>>('/admin/photo', {
      params
    });
  }

  static async getPhotoDetail(id: number) {
    return await baseFetch.get<PhotoDetail>(`/admin/photo/${id}`);
  }

  static async getPhotoDetailBatch(ids: number[]) {
    return await baseFetch.get<PhotoDetail[]>(`/admin/photo/batch`, {
      params: {
        ids: ids.join(',')
      }
    });
  }

  static async getPhotoExtendInfo(id: number) {
    return await baseFetch.get<{ exifData: ExifType }>(
      `/admin/photo/${id}/extend`
    );
  }

  static async getExtendList() {
    return await baseFetch.get<ExifData[]>('/admin/photo/extend');
  }
}
