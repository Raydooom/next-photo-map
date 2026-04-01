import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import sharp from 'sharp';
import exifr from 'exifr';
const convert = require('heic-convert');
import { PhotoService } from './photo.services';
import { locationService } from './location.services';
import { photoExifService } from './photoExif.services';

import {
  PHOTO_BASE_DIR,
  THUMBNAIL_LARGE_DIR,
  THUMBNAIL_SMALL_DIR
} from '../config';
import * as Utils from '../utils';

interface FileGroup {
  name: string; // 不含扩展名的文件名
  image?: string; // 图片绝对路径
  video?: string; // 视频绝对路径
  dir: string; // 所在目录绝对路径
  mimeType: string; // 文件MIME类型
}

export class ScannerService {
  private photoService: PhotoService;
  constructor(appUrl?: string) {
    this.photoService = new PhotoService(appUrl);
  }
  /**
   * 获取 Sharp 实例，对于 HEIC 文件会先进行转换
   */
  private async getSharpInstance(filePath: string): Promise<sharp.Sharp> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.heic') {
      try {
        const inputBuffer = await fs.promises.readFile(filePath);
        const outputBuffer = await convert({
          buffer: inputBuffer, // the HEIC file buffer
          format: 'JPEG', // output format
          quality: 1 // the jpeg compression quality, between 0 and 1
        });
        return sharp(outputBuffer);
      } catch (error) {
        console.error(`Failed to convert HEIC file ${filePath}:`, error);
        throw error;
      }
    }
    return sharp(filePath);
  }
  /**
   * 生成缩略图
   * @param imagePath 图片路径
   * @param filename 图片文件名
   */

  private async generateThumbnails(
    imagePath: string,
    filename: string
  ): Promise<{ smallLocalPath: string; largeLocalPath: string }> {
    // 生成唯一文件名防止冲突，或者保持原名结构
    // 这里简单起见，使用 hash 或者 UUID，或者保持目录结构
    // 为了简单，所有缩略图扁平化存储，文件名加上 hash
    const hash = Buffer.from(path.relative(PHOTO_BASE_DIR, imagePath))
      .toString('base64')
      .replace(/\//g, '_')
      .substring(0, 10);
    const thumbName = `${filename}_${hash}.jpg`;

    const smallLocalPath = path.join(THUMBNAIL_SMALL_DIR, thumbName);
    const largeLocalPath = path.join(THUMBNAIL_LARGE_DIR, thumbName);

    const sharpInstance = await this.getSharpInstance(imagePath);
    const image = sharpInstance.rotate();

    // 小图: 最长 200px
    await image
      .clone()
      .resize({ width: 200, height: 200, fit: 'inside' })
      .toFormat('jpeg', { quality: 80 })
      .toFile(smallLocalPath);

    // 大图: 最长 1400px
    await image
      .clone()
      .resize({
        width: 1400,
        height: 1400,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat('jpeg', { quality: 85 })
      .toFile(largeLocalPath);

    return {
      smallLocalPath,
      largeLocalPath
    };
  }
  /**
   * 开始扫描目录
   * @param force 是否强制重新扫描
   */
  async startScanner(force: boolean = false) {
    const files = await glob('**.{jpg,jpeg,png,heic,webp,mp4,mov}', {
      cwd: PHOTO_BASE_DIR,
      absolute: true,
      nocase: true
    });

    const groups = this.groupFiles(files);

    // 3. 处理每一组
    let processedCount = 0;
    const currentPaths = new Set<string>();

    const dataMap = new Map<string, any>();

    for (const group of groups.values()) {
      if (group.image) {
        const relativePath = path.relative(PHOTO_BASE_DIR, group.image);
        currentPaths.add(relativePath);
        const data = await this.processGroup(group, force);
        dataMap.set(relativePath, data);
        processedCount++;
      }
    }

    return dataMap;
  }

  /**
   * 将文件按文件名分组
   */
  private groupFiles(files: string[]): Map<string, FileGroup> {
    const groups = new Map<string, FileGroup>();

    for (const file of files) {
      const dir = path.dirname(file);
      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, path.extname(file));
      const key = path.join(dir, name); // 使用 目录+文件名 作为唯一键

      if (!groups.has(key)) {
        groups.set(key, { name, dir, mimeType: '' });
      }

      const group = groups.get(key)!;
      if (['.jpg', '.jpeg', '.png', '.heic', '.webp'].includes(ext)) {
        group.image = file;
        group.mimeType = Utils.getMimeType(file);
      } else if (['.mp4', '.mov'].includes(ext)) {
        group.video = file;
      }
    }

    return groups;
  }

  /**
   * 处理单个文件组
   */
  private async processGroup(group: FileGroup, force: boolean) {
    if (!group.image) return;

    const relativePath = path.relative(PHOTO_BASE_DIR, group.image);

    // 根据原始路径检查数据库是否存在
    const existing = await this.photoService.checkPhotoExists(relativePath);

    // 如果是增量模式且记录已存在，则跳过
    if (!force && existing) {
      return;
    }

    try {
      // 以下为 全量模式 或 增量模式下的新文件 处理逻辑

      // 1. 获取文件基础信息
      const stats = fs.statSync(group.image);

      // 2. 准备 video path
      let videoRelativePath = null;
      if (group.video) {
        videoRelativePath = path.relative(PHOTO_BASE_DIR, group.video);
      }

      // 3. 提取主色调 (每次都重算，确保最新)
      let dominantColor = null;
      const image = await this.getSharpInstance(group.image);
      try {
        const { data } = await image
          .resize(1, 1, { fit: 'cover' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        const r = data[0];
        const g = data[1];
        const b = data[2];
        dominantColor = `rgb(${r},${g},${b})`;
      } catch (err) {
        console.warn(`Failed to extract color for ${group.image}:`, err);
      }

      // 4. 读取 EXIF 和元数据 (每次都重算)
      let takenAt = stats.birthtime;

      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      let exifData: any = null;

      try {
        const imageBuffer = await fs.promises.readFile(group.image);
        // 扩展 exifr 解析
        const exif = await exifr
          .parse(imageBuffer, {
            tiff: true,
            exif: true,
            gps: true
          })
          .catch(() => null);

        exifData = exif || null;
        takenAt = exif?.DateTimeOriginal || takenAt;
      } catch (err) {
        console.warn(`Failed to read metadata for ${group.image}:`, err);
      }

      let photoId: number;
      // CREATE 逻辑 (新文件)
      const { smallLocalPath, largeLocalPath } = await this.generateThumbnails(
        group.image,
        group.name
      );

      const photoData = {
        filename: path.basename(group.image),
        originalPath: relativePath,
        size: stats.size,
        mimeType: group.mimeType,
        smallThumbnail: smallLocalPath,
        largeThumbnail: largeLocalPath,
        videoPath: videoRelativePath,
        width,
        height,
        takenAt,
        dominantColor
      };

      // 强制刷新并且存在记录，则更新；否则创建
      let photo;
      if (force && existing) {
        photo = await this.photoService.updatePhoto(
          photoData,
          existing?.id as number
        );
        // await locationService.deleteLocationByPhotoId(photo.id);
      } else {
        photo = await this.photoService.createPhoto(photoData);
      }
      photoId = photo.id;

      // 6. 保存关联数据 (Exif & Location) - Create 和 Update 共用逻辑
      if (exifData) {
        // 处理曝光时间
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
        // 处理方向
        let bearing: number | null = null;
        if (exifData.GPSImgDirection !== undefined) {
          bearing =
            typeof exifData.GPSImgDirection === 'number'
              ? exifData.GPSImgDirection
              : parseFloat(exifData.GPSImgDirection);
        }

        const latitudeDMS =
          exifData.GPSLatitude && exifData.GPSLatitudeRef
            ? Utils.formatDMSFromRaw(
                exifData.GPSLatitude,
                exifData.GPSLatitudeRef
              )
            : exifData.latitude
              ? Utils.toDMS(exifData.latitude, true)
              : null;

        const longitudeDMS =
          exifData.GPSLongitude && exifData.GPSLongitudeRef
            ? Utils.formatDMSFromRaw(
                exifData.GPSLongitude,
                exifData.GPSLongitudeRef
              )
            : exifData.longitude
              ? Utils.toDMS(exifData.longitude, false)
              : null;

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
          GPSLongitudeRef: exifData.GPSLatitudeRef,
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

          // 方向转换为方向字符串
          bearingDirection:
            bearing !== null ? Utils.getDirectionFromBearing(bearing) : null,

          exifImageWidth: exifData.ExifImageWidth,
          exifImageHeight: exifData.ExifImageHeight,

          rawData: exifData
        };
        await photoExifService.savePhotoExif(photoId, data);
        // if (exifData.latitude && exifData.longitude) {
        //   const bearingDirection =
        //     bearing !== null ? Utils.getDirectionFromBearing(bearing) : null;

        //   // 逆地理编码
        //   let addressInfo: any = {};

        //   await locationService.createLocation({
        //     photoId: photoId,
        //     latitude: exifData.latitude,
        //     longitude: exifData.longitude,
        //     GPSLatitude: latitudeDMS,
        //     GPSLongitude: longitudeDMS,
        //     altitude: exifData.GPSAltitude
        //       ? Number(exifData.GPSAltitude.toFixed(2))
        //       : null,
        //     bearing: bearing,
        //     bearingDirection: bearingDirection,
        //     ...addressInfo
        //   });
        // }
      } else {
        // 删除旧记录
        await photoExifService.deletePhotoExifByPhotoId(photoId);
      }

      console.log(`Processed photo: ${relativePath} (ID: ${photoId})`);
    } catch (error) {
      console.error(`Error processing ${group.image}:`, error);
    }
  }
}
