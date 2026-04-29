import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import sharp from 'sharp';
import exifr from 'exifr';
const convert = require('heic-convert');
import { FileManageService } from './fileManage.services';
import { PhotoService } from './photo.services';
import { locationService } from './location.services';
import { photoExifService } from './photoExif.services';

import { PHOTO_BASE_DIR } from '../config';
import * as Utils from '../utils';
import { GeocodingService } from '../utils/geocoding';
import { createLogger } from '../utils/logger';

interface FileGroup {
  fileName: string; // 包含扩展名的文件名
  videoName?: string; // 视频文件扩展名
  name: string; // 不含扩展名的文件名
  ext: string; // 文件扩展名，包含点号
  imageAbsolutePath?: string; // 图片绝对路径
  videoAbsolutePath?: string; // 视频绝对路径
  dirAbsolutePath: string; // 所在目录绝对路径
  mimeType: string; // 文件MIME类型
}

export class ScannerService {
  private photoService: PhotoService;
  private fileManageService: FileManageService;
  private geocodingService: GeocodingService;
  private logger = createLogger('SCANNER');
  private scanStartTime: number = 0;
  private successCount: number = 0;
  private failedCount: number = 0;
  private skippedCount: number = 0;

  constructor(appUrl?: string) {
    this.photoService = new PhotoService(appUrl);
    this.fileManageService = new FileManageService();
    this.geocodingService = new GeocodingService();
  }

  /**
   * 开始扫描目录
   * @param force 是否强制重新扫描
   */
  async startScanner(force: boolean = false) {
    this.scanStartTime = Date.now();
    this.successCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;

    this.logger.info(`========== 开始扫描图片目录 ==========`);
    this.logger.info(`扫描模式: ${force ? '全量扫描' : '增量扫描'}`);
    this.logger.info(`扫描目录: ${PHOTO_BASE_DIR}`);

    const files = await glob('**.{jpg,jpeg,png,heic,webp,mp4,mov}', {
      cwd: PHOTO_BASE_DIR,
      absolute: true,
      nocase: true
    });

    this.logger.info(`发现文件总数: ${files.length}`);

    const groups = this.groupFiles(files);
    const totalGroups = Array.from(groups.values()).filter(g => g.imageAbsolutePath).length;

    this.logger.info(`图片文件组数: ${totalGroups}`);

    let processedCount = 0;
    const currentPaths = new Set<string>();
    const dataMap = new Map<string, any>();

    for (const group of groups.values()) {
      if (group.imageAbsolutePath) {
        const relativePath = path.relative(
          PHOTO_BASE_DIR,
          group.imageAbsolutePath
        );
        currentPaths.add(relativePath);
        processedCount++;

        this.logger.info(`[${processedCount}/${totalGroups}] 处理: ${relativePath}`);
        
        const data = await this.processGroup(group, force);
        dataMap.set(relativePath, data);
      }
    }

    const scanDuration = ((Date.now() - this.scanStartTime) / 1000).toFixed(2);
    
    this.logger.success(`========== 扫描完成 ==========`);
    this.logger.info(`扫描耗时: ${scanDuration} 秒`);
    this.logger.success(`成功处理: ${this.successCount} 个`);
    this.logger.warning(`跳过: ${this.skippedCount} 个`);
    this.logger.error(`失败: ${this.failedCount} 个`);

    return dataMap;
  }

  /**
   * 处理单个文件组
   */
  private async processGroup(group: FileGroup, force: boolean) {
    if (!group.imageAbsolutePath) return;

    const relativePath = path.relative(PHOTO_BASE_DIR, group.imageAbsolutePath);

    // 根据原始路径检查数据库是否存在
    const existing = await this.photoService.checkPhotoExists(
      group.imageAbsolutePath
    );

    // 如果是增量模式且记录已存在，则跳过
    if (!force && existing) {
      this.skippedCount++;
      this.logger.warning(`跳过: ${relativePath} (已存在)`);
      return;
    }

    try {
      // 以下为 全量模式 或 增量模式下的新文件 处理逻辑
      const fileBuffer = await fs.promises.readFile(group.imageAbsolutePath);

      const sharpImage = await this.getSharpInstance(fileBuffer, group.ext);
      const metadata = await sharpImage.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const size = metadata.size || 0;

      const exifData = await this.getMetadata(fileBuffer, group);

      // 2. 准备 video path
      let videoRelativePath = null;
      if (group.videoAbsolutePath) {
        videoRelativePath = path.relative(
          PHOTO_BASE_DIR,
          group.videoAbsolutePath
        );
      }
      // 生成缩略图
      const { smallBuffer, largeBuffer } = await this.generateThumbnails(
        fileBuffer,
        group.ext
      );
      // 使用小图提取主色调，提高效率
      const dominantColor = await this.getDominantColor(smallBuffer, group);

      // 准备上传任务
      const uploadTasks = [
        this.fileManageService.uploadFile({
          date: exifData.takenAt,
          fileName: group.fileName,
          fileBuffer,
          size: 'raw'
        }),
        this.fileManageService.uploadFile({
          date: exifData.takenAt,
          fileName: group.fileName,
          fileBuffer: smallBuffer,
          size: 'small'
        }),
        this.fileManageService.uploadFile({
          date: exifData.takenAt,
          fileName: group.fileName,
          fileBuffer: largeBuffer,
          size: 'large'
        })
      ];

      // 如果有视频文件，添加视频上传任务
      let videoUploadTask = null;
      if (group.videoAbsolutePath) {
        const videoBuffer = await fs.promises.readFile(group.videoAbsolutePath);
        const videoExt = path.extname(group.videoAbsolutePath);
        videoUploadTask = this.fileManageService.uploadFile({
          date: exifData.takenAt,
          fileName: `${group.name}${videoExt}`,
          fileBuffer: videoBuffer,
          size: 'raw'
        });
        uploadTasks.push(videoUploadTask);
      }

      this.logger.info(`上传文件: ${relativePath}`);
      const uploadRes = await Promise.all(uploadTasks);

      const isSuccess = uploadRes.every(res => res?.key && res?.success);

      if (!isSuccess) {
        this.failedCount++;
        this.logger.error(`上传失败: ${relativePath}`);
        return null;
      }

      const photoData = {
        filename: group.fileName,
        originalPath: group.imageAbsolutePath,
        size,
        mimeType: group.mimeType,
        originalKey: uploadRes[0]?.key,
        thumbSmallKey: uploadRes[1]?.key,
        thumbLargeKey: uploadRes[2]?.key,
        videoKey: group.videoAbsolutePath
          ? uploadRes[3]?.key
          : videoRelativePath,
        width,
        height,
        takenAt: exifData.takenAt,
        dominantColor
      };

      // 强制刷新并且存在记录，则更新；否则创建
      let photo;
      if (force && existing) {
        photo = await this.photoService.updatePhoto(
          photoData,
          existing.id as number
        );
      } else {
        photo = await this.photoService.createPhoto(photoData);
      }

      if (exifData) {
        let exposureTimeStr = null;
        if (exifData.ExposureTime) {
          if (typeof exifData.ExposureTime === 'number') {
            if (exifData.ExposureTime < 1) {
              exposureTimeStr = `1/${Math.round(1 / exifData.ExposureTime)}`;
            } else {
              exposureTimeStr = String(exifData.ExposureTime);
            }
          } else {
            exposureTimeStr = String(exifData.ExposureTime);
          }
        }

        let bearing: number | null = null;
        if (exifData.GPSImgDirection !== undefined) {
          bearing =
            typeof exifData.GPSImgDirection === 'number'
              ? exifData.GPSImgDirection
              : parseFloat(exifData.GPSImgDirection);
        }

        const data = {
          make: exifData.Make,
          model: exifData.Model,
          lensModel: exifData.LensModel,
          fNumber: exifData.FNumber
            ? Number(exifData.FNumber.toFixed(2))
            : null,
          exposureTime: exposureTimeStr,
          iso: exifData.ISO,
          focalLength: exifData.FocalLength,
          exposureBias: exifData.ExposureBiasValue,
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          GPSLatitude: exifData.GPSLatitude,
          GPSLatitudeRef: exifData.GPSLatitudeRef,
          GPSLongitude: exifData.GPSLongitude,
          GPSLongitudeRef: exifData.GPSLongitudeRef,
          altitude: exifData.GPSAltitude
            ? Number(exifData.GPSAltitude.toFixed(2))
            : null,
          lensMake: exifData.LensMake,
          flash:
            typeof exifData.Flash === 'object'
              ? JSON.stringify(exifData.Flash)
              : String(exifData.Flash ?? ''),
          whiteBalance: String(exifData.WhiteBalance ?? ''),
          meteringMode: String(exifData.MeteringMode ?? ''),
          software: exifData.Software,
          exposureProgram: String(exifData.ExposureProgram ?? ''),
          exposureMode: String(exifData.ExposureMode ?? ''),
          colorSpace: String(exifData.ColorSpace ?? ''),
          focalLengthIn35mmFormat: exifData.FocalLengthIn35mmFormat,
          gpsTimeStamp: exifData.GPSTimeStamp,
          gpsImgDirection: bearing,
          bearingDirection:
            bearing !== null ? Utils.getDirectionFromBearing(bearing) : null,
          exifImageWidth: exifData.ExifImageWidth,
          exifImageHeight: exifData.ExifImageHeight,
          rawData: exifData
        };
        await photoExifService.savePhotoExif(photo.id, data);

        // 处理位置信息
        if (exifData.latitude && exifData.longitude) {
          const bearingDirection =
            bearing !== null ? Utils.getDirectionFromBearing(bearing) : null;

          // 逆地理编码
          const addressInfo = await this.geocodingService.reverseGeocode(
            exifData.latitude,
            exifData.longitude
          );

          if (!addressInfo) return;
          const { formatted_address, addressComponent } = addressInfo;
          await locationService.saveLocation(photo.id, {
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            GPSLatitude: exifData.GPSLatitude,
            GPSLongitude: exifData.GPSLongitude,
            altitude: exifData.GPSAltitude
              ? Number(exifData.GPSAltitude.toFixed(2))
              : null,
            bearing: bearing,
            bearingDirection: bearingDirection,
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
        }
      } else {
        await photoExifService.deletePhotoExifByPhotoId(photo.id);
      }

      this.successCount++;
      this.logger.success(`处理成功: ${relativePath} (ID: ${photo.id})`);
    } catch (error) {
      this.failedCount++;
      this.logger.error(`处理失败: ${relativePath} - ${(error as Error).message}`);
    }
  }

  /**
   * 将文件按文件名分组
   */
  private groupFiles(files: string[]): Map<string, FileGroup> {
    const groups = new Map<string, FileGroup>();

    for (const file of files) {
      const fileName = path.basename(file);
      const dir = path.dirname(file);
      const name = path.basename(file, path.extname(file));
      const ext = path.extname(file).toLowerCase();
      const key = path.join(dir, name); // 使用 目录+文件名 作为唯一键

      if (!groups.has(key)) {
        groups.set(key, {
          name,
          ext,
          dirAbsolutePath: dir,
          mimeType: '',
          fileName: ''
        });
      }

      const group = groups.get(key)!;
      if (['.jpg', '.jpeg', '.png', '.heic', '.webp'].includes(ext)) {
        group.imageAbsolutePath = file;
        group.mimeType = Utils.getMimeType(file);
        group.fileName = fileName;
      } else if (['.mp4', '.mov'].includes(ext)) {
        group.videoAbsolutePath = file;
        group.videoName = fileName;
      }
    }

    return groups;
  }

  /**
   * 获取 Sharp 实例，对于 HEIC 文件会先进行转换
   */
  private async getSharpInstance(
    buffer: Buffer,
    ext: string
  ): Promise<sharp.Sharp> {
    if (ext === '.heic') {
      try {
        const outputBuffer = await convert({
          buffer: buffer, // the HEIC file buffer
          format: 'JPEG', // output format
          quality: 1 // the jpeg compression quality, between 0 and 1
        });
        return sharp(outputBuffer);
      } catch (error) {
        console.error(`Failed to convert HEIC file ${ext}:`, error);
        throw error;
      }
    }
    return sharp(buffer);
  }
  /**
   * 生成缩略图
   * @param imagePath 图片路径
   * @param filename 图片文件名
   */

  private async generateThumbnails(
    fileBuffer: Buffer,
    ext: string
  ): Promise<{ smallBuffer: Buffer; largeBuffer: Buffer }> {
    const sharpInstance = await this.getSharpInstance(fileBuffer, ext);
    const image = sharpInstance.rotate();

    // 小图: 最长 200px
    const smallBuffer = await image
      .clone()
      .resize({ width: 200, height: 200, fit: 'inside' })
      .toFormat('jpeg', { quality: 80 })
      .toBuffer();

    // 大图: 最长 1400px
    const largeBuffer = await image
      .clone()
      .resize({
        width: 1400,
        height: 1400,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat('jpeg', { quality: 85 })
      .toBuffer();

    return {
      smallBuffer,
      largeBuffer
    };
  }

  /**
   * 获取文件元数据
   */
  private async getMetadata(fileBuffer: Buffer, group: FileGroup) {
    // 4. 读取 EXIF 和元数据 (每次都重算)
    const stats = fs.statSync(group.imageAbsolutePath!);
    let takenAt = stats.birthtime;

    let exifData: any = null;
    try {
      // 扩展 exifr 解析
      const exif = await exifr
        .parse(fileBuffer, {
          tiff: true,
          exif: true,
          gps: true
        })
        .catch(() => null);

      exifData = exif || null;
    } catch (err) {
      console.warn(
        `Failed to read metadata for ${group.imageAbsolutePath}:`,
        err
      );
    }
    return { ...exifData, takenAt: exifData?.DateTimeOriginal || takenAt };
  }
  /**
   * 获取文件主色调
   */
  private async getDominantColor(fileBuffer: Buffer, group: FileGroup) {
    try {
      const { data } = await sharp(fileBuffer)
        .resize(1, 1, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const r = data[0];
      const g = data[1];
      const b = data[2];
      return `rgb(${r},${g},${b})`;
    } catch (err) {
      console.warn(
        `Failed to extract color for ${group.imageAbsolutePath}:`,
        err
      );
      return null;
    }
  }
}
