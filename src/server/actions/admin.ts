'use server';

import { revalidatePath } from 'next/cache';
import { ScannerService } from '../services/admin.services';
import { PhotoService } from '../services/photo.services';
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
