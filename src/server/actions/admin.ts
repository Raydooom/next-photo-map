'use server';

import { ScannerService } from '../services/admin.services';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';
import { locationService } from '../services/location.services';
import { GeocodingService } from '../utils/geocoding';

const scannerService = new ScannerService();
const photoService = new PhotoService();

export const scanner = async (force: boolean = false) => {
  const result = await scannerService.startScanner(force);
  // 更新静态页面缓存数据
  return result;
};

export const getAllPhotos = async () => {
  const photos = await photoService.getAllPhotos();
  return photos;
};

// 获取所有照片并检查文件是否存在
export const getPhotosWithFileStatus = async () => {
  const photos = await photoService.getAllPhotos();
  const photosWithStatus = await photoService.batchCheckFileExists(photos);
  return photosWithStatus;
};

export const deletePhoto = async (id: number) => {
  const result = await photoService.deletePhoto(id);
  return result;
};

export const deleteMissingPhotos = async () => {
  const photos = await photoService.getAllPhotos();
  const photosWithStatus = await photoService.batchCheckFileExists(photos);
  const missingPhotos = photosWithStatus.filter((p) => !p.fileExists);

  const deletedCount = { success: 0, failed: 0 };

  for (const photo of missingPhotos) {
    try {
      await photoService.deletePhoto(photo.id);
      deletedCount.success++;
    } catch (error) {
      deletedCount.failed++;
      console.warn(`Failed to delete missing photo ${photo.id}:`, error);
    }
  }

  return {
    ...deletedCount,
    totalChecked: photos.length,
    missingCount: missingPhotos.length
  };
};

export const updatePhotoLocation = async (
  photoId: number,
  latitude: number,
  longitude: number
) => {
  const geocodingService = new GeocodingService();

  try {
    const addressInfo = await geocodingService.reverseGeocode(
      latitude,
      longitude
    );

    if (!addressInfo) {
      throw new Error('地理编码失败');
    }

    await photoExifService.savePhotoExif(photoId, {
      latitude,
      longitude
    });
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
  } catch (error) {
    console.error('Failed to update photo location:', error);
    throw error;
  }
};

export const deletePhotoLocation = async (photoId: number) => {
  try {
    await locationService.deleteLocationByPhotoId(photoId).catch(() => {});

    const exif = await photoExifService.getPhotoExifByPhotoId(photoId);
    if (exif) {
      await photoExifService.savePhotoExif(photoId, {
        latitude: null,
        longitude: null
      });
    }

    return { success: true, message: '位置删除成功' };
  } catch (error) {
    console.error('Failed to delete photo location:', error);
    throw error;
  }
};

export const updatePhotoTop = async (photoId: number, top: boolean) => {
  try {
    await photoService.updatePhotoTop(photoId, top);

    return { success: true, message: top ? '置顶成功' : '取消置顶成功' };
  } catch (error) {
    console.error('Failed to update photo top:', error);
    throw error;
  }
};
