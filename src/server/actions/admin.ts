'use server';

// import { revalidatePath } from 'next/cache';
import { ScannerService } from '../services/admin.services';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';
import { locationService } from '../services/location.services';
import { GeocodingService } from '../utils/geocoding';
// import { siteConfig } from '../../config/site';
import { deployService } from '../services/deploy.services';

const scannerService = new ScannerService();
const photoService = new PhotoService();

// 需要更新静态页面的路径
// const refreshPaths = siteConfig.navItems
//   .filter(item => item.meta.needRefresh)
//   .map(item => item.href);

const refreshPages = () => {
  // for (const path of refreshPaths) {
  //   revalidatePath(path);
  // }
};

export const scanner = async (force: boolean = false) => {
  const result = await scannerService.startScanner(force);
  // 更新静态页面缓存数据
  refreshPages();
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
  refreshPages();
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

  refreshPages();

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

    refreshPages();

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

    refreshPages();

    return { success: true, message: '位置删除成功' };
  } catch (error) {
    console.error('Failed to delete photo location:', error);
    throw error;
  }
};

export const updatePhotoTop = async (photoId: number, top: boolean) => {
  try {
    await photoService.updatePhotoTop(photoId, top);

    refreshPages();

    return { success: true, message: top ? '置顶成功' : '取消置顶成功' };
  } catch (error) {
    console.error('Failed to update photo top:', error);
    throw error;
  }
};

export interface DeployStepResult {
  step: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface DeployResult {
  success: boolean;
  steps: DeployStepResult[];
  totalDuration: number;
}

export const rebuild = async (): Promise<DeployResult> => {
  const startTime = Date.now();
  const steps: DeployStepResult[] = [];

  console.log('Starting rebuild...');

  console.log('Step 1: Git Pull');
  const gitResult = await deployService.gitPull();
  steps.push({
    step: 'git pull',
    ...gitResult
  });

  if (!gitResult.success) {
    console.error('Git pull failed:', gitResult.error);
    return {
      success: false,
      steps,
      totalDuration: Date.now() - startTime
    };
  }

  console.log('Step 2: Docker Compose Build');
  const buildResult = await deployService.dockerComposeBuild();
  steps.push({
    step: 'docker compose build',
    ...buildResult
  });

  if (!buildResult.success) {
    console.error('Docker compose build failed:', buildResult.error);
    return {
      success: false,
      steps,
      totalDuration: Date.now() - startTime
    };
  }

  console.log('Step 3: Docker Compose Down');
  const downResult = await deployService.dockerComposeDown();
  steps.push({
    step: 'docker compose down',
    ...downResult
  });

  console.log('Step 4: Docker Compose Up');
  const upResult = await deployService.dockerComposeUp();
  steps.push({
    step: 'docker compose up',
    ...upResult
  });

  if (!upResult.success) {
    console.error('Docker compose up failed:', upResult.error);
    return {
      success: false,
      steps,
      totalDuration: Date.now() - startTime
    };
  }

  console.log('Rebuild completed successfully');

  return {
    success: true,
    steps,
    totalDuration: Date.now() - startTime
  };
};
