'use server';

import 'server-only';

/**
 * 管理端操作入口。**每个导出都必须先 requireAdmin()。**
 *
 * 'use server' 会把每个函数编译成可公开 POST 的端点，而 middleware 只覆盖
 * 页面路径，拦不住直接调用 action。少写一次校验就等于把删除接口挂到公网上。
 */

import { requireAdmin } from '@/server/auth';
import { photoService } from '@/server/services/photo/photo.service';
import { photoExifService } from '@/server/services/photo/exif.service';
import { locationService } from '@/server/services/photo/location.service';
import { geocodingService } from '@/server/services/ingestion/geocoding.service';
import { aiService } from '@/server/services/ai/analysis.service';


/** 获取全部照片，带签名 URL 与 MinIO 中的文件存在状态 */
export const getPhotosWithFileStatus = async () => {
  await requireAdmin();
  return await photoService.listAllWithFileStatus();
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

  const addressInfo = await geocodingService.reverseGeocode(
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
  return await aiService.createAiInfo(photo);
};
