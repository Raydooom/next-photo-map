'use server';

import { revalidatePath } from 'next/cache';
import { ScannerService } from '../services/admin.services';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';
import { locationService } from '../services/location.services';
import { GeocodingService } from '../utils/geocoding';
import { siteConfig } from '../../config/site';

const scannerService = new ScannerService();
const photoService = new PhotoService();

// 需要更新静态页面的路径
const refreshPaths = siteConfig.navItems
  .filter(item => item.meta.needRefresh)
  .map(item => item.href);

export const scanner = async (force: boolean = false) => {
  const result = await scannerService.startScanner(force);
  // 更新静态页面缓存数据
  for (const path of refreshPaths) {
    revalidatePath(path);
  }
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
  for (const path of refreshPaths) {
    revalidatePath(path);
  }
  return result;
};

export const deleteMissingPhotos = async () => {
  const photos = await photoService.getAllPhotos();
  const photosWithStatus = await photoService.batchCheckFileExists(photos);
  const missingPhotos = photosWithStatus.filter(p => !p.fileExists);
  
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
  
  for (const path of refreshPaths) {
    revalidatePath(path);
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
    const addressInfo = await geocodingService.reverseGeocode(latitude, longitude);
    
    if (!addressInfo) {
      throw new Error('地理编码失败');
    }

    await photoExifService.savePhotoExif(photoId, {
      latitude,
      longitude
    });

    await locationService.saveLocation(photoId, {
      latitude,
      longitude,
      country: addressInfo.country || '',
      province: addressInfo.province || '',
      city: addressInfo.city || '',
      district: addressInfo.district || '',
      address: addressInfo.address || '',
      rawData: addressInfo.rawData || {}
    });

    for (const path of refreshPaths) {
      revalidatePath(path);
    }

    return { success: true, message: '位置更新成功' };
  } catch (error) {
    console.error('Failed to update photo location:', error);
    throw error;
  }
};
