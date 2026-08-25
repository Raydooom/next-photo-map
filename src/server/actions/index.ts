'use server';
import { PhotoService } from '../services/photo.services';
import { locationService } from '../services/location.services';
import { getImageUrl } from '../lib/oss';

const photoService = new PhotoService();

/** getAllLocations 带 withThumb 时的返回形状 */
interface LocationWithThumb {
  photo?: {
    id: number;
    thumbSmallKey: string | null;
    width: number | null;
    height: number | null;
  } | null;
  [key: string]: unknown;
}

export const getPhotoList = async ({
  page = 1,
  pageSize = 20,
  withLocation = false,
  withExif = false,
  withAiAnalysis = false,
  top = false
} = {}) => {
  return await photoService.listPhotos({
    page,
    pageSize,
    withLocation,
    withExif,
    withAiAnalysis,
    top
  });
};

export const countAllPhotos = async () => {
  return await photoService.countAllPhotos();
};

export const getPhotoDetail = async (photoId: number) => {
  return await photoService.getPhotoById(photoId);
};

export const getPhotoDetailBatch = async (photoIds: number[]) => {
  return await photoService.getPhotosByIds(photoIds);
};

export const getLocations = async ({ select = {}, withThumb = false } = {}) => {
  const list = await locationService.getAllLocations({ select, withThumb });

  if (!withThumb) return list;

  /**
   * 把缩略图的存储键换成带签名的可访问地址。
   * 与照片列表那边一致，签名在服务端完成，键不外泄。
   */
  return await Promise.all(
    (list as LocationWithThumb[]).map(async (item) => ({
      ...item,
      photo: item.photo
        ? {
            ...item.photo,
            thumbSmallUrl: item.photo.thumbSmallKey
              ? await getImageUrl(item.photo.thumbSmallKey)
              : null
          }
        : null
    }))
  );
};
