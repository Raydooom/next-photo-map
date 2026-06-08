import fs from 'fs';
import path from 'path';
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
import { FileGroup, scanImageGroups } from '../utils/photo-files';
import * as AI from '@/server/actions/ai';

/**
 * 照片处理结果
 */
export interface PhotoProcessResult {
  success: boolean;
  photoId?: number;
  aiAnalyzed?: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * 照片处理选项
 */
export interface PhotoProcessOptions {
  imagePath: string;
  videoPath?: string | null;
  force?: boolean; // 是否强制更新已存在的照片
  enableAI?: boolean; // 是否启用 AI 分析
}

type ProgressType = 'start' | 'progress' | 'complete' | 'error';

interface ProgressData {
  type: ProgressType;
  message: string;
  data?: any;
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
  private progressCallback?: (data: ProgressData) => void;

  constructor(appUrl?: string) {
    this.photoService = new PhotoService(appUrl);
    this.fileManageService = new FileManageService();
    this.geocodingService = new GeocodingService();
  }

  setProgressCallback(callback: (data: ProgressData) => void) {
    this.progressCallback = callback;
  }

  private emitProgress(type: ProgressType, message: string, data?: any) {
    this.progressCallback?.({ type, message, data });
  }

  /**
   * 获取 Sharp 实例，对于 HEIC 文件会先进行转换
   */
  static async getSharpInstance(
    buffer: Buffer,
    ext: string
  ): Promise<sharp.Sharp> {
    if (ext === '.heic') {
      try {
        const outputBuffer = await convert({
          buffer: buffer,
          format: 'JPEG',
          quality: 1
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
   */
  static async generateThumbnails(
    fileBuffer: Buffer,
    ext: string
  ): Promise<{ smallBuffer: Buffer; largeBuffer: Buffer }> {
    const sharpInstance = await ScannerService.getSharpInstance(
      fileBuffer,
      ext
    );
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
   * 获取文件主色调
   */
  static async getDominantColor(fileBuffer: Buffer): Promise<string | null> {
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
      console.warn('Failed to extract color:', err);
      return null;
    }
  }

  /**
   * 读取 EXIF 元数据
   */
  static async readExifData(fileBuffer: Buffer, imagePath: string) {
    const stats = fs.statSync(imagePath);
    let takenAt = stats.birthtime;
    let exifData: any = null;

    try {
      const exif = await exifr
        .parse(fileBuffer, {
          tiff: true,
          exif: true,
          gps: true
        })
        .catch(() => null);

      exifData = exif || null;
      if (exifData?.DateTimeOriginal) {
        takenAt = exifData.DateTimeOriginal;
      }
    } catch (err) {
      console.warn(`Failed to read EXIF for ${imagePath}:`, err);
    }

    return { exifData, takenAt };
  }

  /**
   * 处理单张照片（入库 + 可选 AI 分析）
   * 这是核心的照片处理方法，可被扫描和上传功能复用
   */
  async processPhoto(
    options: PhotoProcessOptions
  ): Promise<PhotoProcessResult> {
    const { imagePath, videoPath, force = false, enableAI = false } = options;

    try {
      // 检查是否已存在
      const existing = await this.photoService.checkPhotoExists(imagePath);
      if (existing && !force) {
        return { success: false, skipped: true, error: '照片已存在' };
      }

      // 读取文件
      const fileBuffer = await fs.promises.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const fileName = path.basename(imagePath);

      // 获取 Sharp 实例和元数据
      const sharpImage = await ScannerService.getSharpInstance(fileBuffer, ext);
      const metadata = await sharpImage.metadata();
      const width = metadata.autoOrient.width || 0;
      const height = metadata.autoOrient.height || 0;
      const size = metadata.size || 0;

      // 读取 EXIF
      const { exifData, takenAt } = await ScannerService.readExifData(
        fileBuffer,
        imagePath
      );

      // 生成缩略图
      const { smallBuffer, largeBuffer } =
        await ScannerService.generateThumbnails(fileBuffer, ext);

      // 提取主色调
      const dominantColor = await ScannerService.getDominantColor(smallBuffer);

      // 转换日期为字符串
      const dateStr =
        takenAt instanceof Date
          ? takenAt.toISOString()
          : new Date(takenAt).toISOString();

      // 上传文件到 MinIO
      const uploadTasks = [
        this.fileManageService.uploadFile({
          date: dateStr,
          fileName: fileName,
          fileBuffer,
          size: 'raw'
        }),
        this.fileManageService.uploadFile({
          date: dateStr,
          fileName: fileName,
          fileBuffer: smallBuffer,
          size: 'small'
        }),
        this.fileManageService.uploadFile({
          date: dateStr,
          fileName: fileName,
          fileBuffer: largeBuffer,
          size: 'large'
        })
      ];

      // 如果有视频，上传视频
      if (videoPath) {
        const videoBuffer = await fs.promises.readFile(videoPath);
        const videoFileName = path.basename(videoPath);
        uploadTasks.push(
          this.fileManageService.uploadFile({
            date: dateStr,
            fileName: videoFileName,
            fileBuffer: videoBuffer,
            size: 'raw'
          })
        );
      }

      const uploadRes = await Promise.all(uploadTasks);
      const isSuccess = uploadRes.every(res => res?.key && res?.success);

      if (!isSuccess) {
        return {
          success: false,
          error: '文件上传失败'
        };
      }

      // 创建照片记录
      const mimeType = Utils.getMimeType(imagePath);
      const photoData = {
        filename: fileName,
        originalPath: imagePath,
        size,
        mimeType,
        originalKey: uploadRes[0]!.key,
        thumbSmallKey: uploadRes[1]!.key,
        thumbLargeKey: uploadRes[2]!.key,
        videoKey: videoPath ? uploadRes[3]!.key : null,
        width,
        height,
        takenAt,
        dominantColor
      };

      // 创建或更新照片记录
      let photo;
      if (force && existing) {
        photo = await this.photoService.updatePhoto(photoData, existing.id);
      } else {
        photo = await this.photoService.createPhoto(photoData);
      }

      // 保存 EXIF 信息
      if (exifData) {
        await this.saveExifData(photo.id, exifData);
      }

      // 自动进行 AI 分析
      let aiAnalyzed = false;
      if (enableAI) {
        try {
          // 直接使用刚创建的 photo 记录（包含 thumbLargeKey）
          // 注意：不能用 getPhotoById，它会通过 transformPhoto 删除 key 字段
          await AI.analysis(photo);
          aiAnalyzed = true;
          console.log(`AI 分析完成: ${fileName} (ID: ${photo.id})`);
        } catch (aiError) {
          console.error(`AI 分析失败: ${fileName}`, aiError);
          // AI 分析失败不影响上传成功
        }
      }

      return {
        success: true,
        photoId: photo.id,
        aiAnalyzed
      };
    } catch (error) {
      console.error('处理照片失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败'
      };
    }
  }

  /**
   * 保存 EXIF 数据到数据库
   */
  private async saveExifData(photoId: number, exifData: any) {
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
      fNumber: exifData.FNumber ? Number(exifData.FNumber.toFixed(2)) : null,
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

    await photoExifService.savePhotoExif(photoId, data);

    // 处理位置信息
    if (exifData.latitude && exifData.longitude) {
      const bearingDirection =
        bearing !== null ? Utils.getDirectionFromBearing(bearing) : null;

      const addressInfo = await this.geocodingService.reverseGeocode(
        exifData.latitude,
        exifData.longitude
      );

      if (addressInfo) {
        const { formatted_address, addressComponent } = addressInfo;
        await locationService.saveLocation(photoId, {
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
    }
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

    this.emitProgress('start', '开始扫描图片目录', {
      mode: force ? 'full' : 'incremental',
      directory: PHOTO_BASE_DIR,
      force
    });

    // 扫描并分组（自动配对 Live Photo 视频）
    const { files, groups: allGroups } = await scanImageGroups(PHOTO_BASE_DIR);

    this.logger.info(`发现文件总数: ${files.length}`);
    this.emitProgress('progress', `发现文件总数: ${files.length}`, {
      totalFiles: files.length
    });

    // 增量模式：批量过滤掉已存在的照片，只处理新照片
    let groupsToScan = allGroups;
    if (!force) {
      const existingPaths = await this.photoService.findExistingPaths(
        allGroups.map(g => g.imageAbsolutePath!)
      );
      groupsToScan = allGroups.filter(
        g => !existingPaths.has(g.imageAbsolutePath!)
      );
      this.logger.info(`发现新照片: ${groupsToScan.length} 张`);
      this.emitProgress('progress', `发现新照片: ${groupsToScan.length} 张`, {
        totalGroups: groupsToScan.length
      });
    } else {
      this.logger.info(`图片文件组数: ${allGroups.length}`);
      this.emitProgress('progress', `图片文件组数: ${allGroups.length}`, {
        totalGroups: allGroups.length
      });
    }

    const totalGroups = groupsToScan.length;
    let processedCount = 0;

    for (const group of groupsToScan) {
      const relativePath = path.relative(
        PHOTO_BASE_DIR,
        group.imageAbsolutePath!
      );
      processedCount++;

      this.logger.info(
        `[${processedCount}/${totalGroups}] 处理: ${relativePath}`
      );
      this.emitProgress(
        'progress',
        `开始处理[${processedCount}/${totalGroups}]`,
        { current: processedCount, total: totalGroups, filename: relativePath }
      );

      await this.processGroup(group, force, processedCount, totalGroups);
    }

    const scanDuration = ((Date.now() - this.scanStartTime) / 1000).toFixed(2);

    this.logger.success(`========== 扫描完成 ==========`);
    this.logger.info(`扫描耗时: ${scanDuration} 秒`);
    this.logger.success(`成功处理: ${this.successCount} 个`);
    if (force) {
      this.logger.warning(`跳过: ${this.skippedCount} 个`);
    }
    this.logger.error(`失败: ${this.failedCount} 个`);

    this.emitProgress('complete', '扫描完成', {
      duration: scanDuration,
      success: this.successCount,
      skipped: force ? this.skippedCount : 0, // 增量模式不显示跳过数
      failed: this.failedCount,
      total: totalGroups,
      force
    });

    return {
      success: this.successCount,
      skipped: this.skippedCount,
      failed: this.failedCount
    };
  }

  /**
   * 处理单个文件组（用于扫描流程）
   */
  private async processGroup(
    group: FileGroup,
    force: boolean,
    processedCount: number,
    totalGroups: number
  ): Promise<PhotoProcessResult> {
    const relativePath = path.relative(
      PHOTO_BASE_DIR,
      group.imageAbsolutePath!
    );

    // 调用通用的处理方法（扫描时不自动执行 AI 分析）
    const result = await this.processPhoto({
      imagePath: group.imageAbsolutePath!,
      videoPath: group.videoAbsolutePath || null,
      force,
      enableAI: false
    });

    if (result.success) {
      this.successCount++;
      this.logger.success(`处理成功: ${relativePath} (ID: ${result.photoId})`);
      this.emitProgress(
        'progress',
        `处理完成[${processedCount}/${totalGroups}]`,
        { current: processedCount, total: totalGroups, filename: relativePath }
      );
    } else if (result.skipped) {
      this.skippedCount++;
      this.logger.warning(`跳过: ${relativePath} - ${result.error}`);
    } else {
      this.failedCount++;
      this.logger.error(`处理失败: ${relativePath} - ${result.error}`);
    }

    return result;
  }
}
