'use server';

import 'server-only';

/**
 * 管理端的服务端操作入口，供 admin 下的客户端组件调用。
 *
 * 每个导出都必须先 requireAdmin()。
 *
 * 原因：`'use server'` 会把这里每个函数编译成一个可公开 POST 调用的端点，
 * 而 middleware 的 matcher 只覆盖页面路径 `/admin/:path*`，拦不住对 action
 * 端点的直接调用。少写一次校验，就等于把一个删除接口暴露在公网上。
 */

import { requireAdmin } from '@/server/auth';
import { PhotoService } from '@/server/photo/photo.service';
import { photoExifService } from '@/server/photo/exif.service';
import { locationService } from '@/server/photo/location.service';
import { GeocodingService } from '@/server/ingestion/geocoding.service';
import { AIService } from '@/server/ai/analysis.service';

const photoService = new PhotoService();

/** 获取全部照片并附带 MinIO 中的文件存在状态 */
export const getPhotosWithFileStatus = async () => {
  await requireAdmin();
  const photos = await photoService.getAllPhotos();
  return await photoService.batchCheckFileExists(photos);
};

/** 删除单张照片（含数据库记录、MinIO 对象、源文件） */
export const deletePhoto = async (id: number) => {
  await requireAdmin();
  return await photoService.deletePhoto(id);
};

/** 清理源文件已丢失的照片记录 */
export const deleteMissingPhotos = async () => {
  await requireAdmin();
  return await photoService.deleteMissingPhotos();
};

/** 手动指定照片坐标，并重新逆地理编码 */
export const updatePhotoLocation = async (
  photoId: number,
  latitude: number,
  longitude: number
) => {
  await requireAdmin();

  const addressInfo = await new GeocodingService().reverseGeocode(
    latitude,
    longitude
  );

  if (!addressInfo) {
    throw new Error('地理编码失败');
  }

  await photoExifService.savePhotoExif(photoId, { latitude, longitude });

  const { formatted_address, addressComponent } = addressInfo;
  await locationService.saveLocation(photoId, {
    latitude,
    longitude,
    country: addressComponent.country,
    province: addressComponent.province,
    city: addressComponent.city || addressComponent.province,
    district: addressComponent.district,
    township: addressComponent.township,
    adcode: addressComponent.adcode,
    neighborhood: addressComponent.neighborhood.name,
    type: addressComponent.neighborhood.type,
    formattedAddress: formatted_address,
    rawData: addressInfo
  });

  return { success: true, message: '位置更新成功' };
};

/** 清除照片的位置信息 */
export const deletePhotoLocation = async (photoId: number) => {
  await requireAdmin();

  await locationService.deleteLocationByPhotoId(photoId).catch(() => {});

  const exif = await photoExifService.getPhotoExifByPhotoId(photoId);
  if (exif) {
    await photoExifService.savePhotoExif(photoId, {
      latitude: null,
      longitude: null
    });
  }

  return { success: true, message: '位置删除成功' };
};

/** 切换置顶状态 */
export const updatePhotoTop = async (photoId: number, top: boolean) => {
  await requireAdmin();
  await photoService.updatePhotoTop(photoId, top);
  return { success: true, message: top ? '置顶成功' : '取消置顶成功' };
};

/** 对单张照片重跑 AI 分析 */
export const analysis = async (photo: any) => {
  await requireAdmin();
  return await new AIService().createAiInfo(photo);
};
