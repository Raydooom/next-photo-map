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
  // 获取照片列表
  static async getPhotos(params: PagerRequest) {
    return await baseFetch.get<PagerResponse<PhotoItem>>('/photos', {
      params
    });
  }
  // 获取照片详情
  static async getPhotoDetail(id: number) {
    return await baseFetch.get<PhotoDetail>(`/photos/${id}`);
  }
  // 批量获取照片详情
  static async getPhotoDetailBatch(ids: number[]) {
    return await baseFetch.post<PhotoDetail[]>(`/photos/batch`, {
      body: {
        ids
      }
    });
  }

  // 获取照片扩展信息
  static async getPhotoExtendInfo(id: number) {
    return await baseFetch.get<PhotoExif>(`/photos/${id}/exif`);
  }

  // 获取照片位置列表
  static async getPhotoLocations() {
    return await baseFetch.get<PhotoLocation[]>('/photos/locations');
  }
}
