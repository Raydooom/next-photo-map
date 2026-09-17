import 'server-only';

import { prisma, Prisma } from '@/server/infra/db';
import {
  getImageUrl,
  deleteFileFromMinio,
  checkObjectExists
} from '@/server/infra/storage';
import fs from 'fs';
import path from 'path';
import { VIDEO_EXTENSIONS } from '@/server/ingestion/photo-files';
interface ListPhotosInput {
  page?: number;
  pageSize?: number;
  keyword?: string;
  withLocation?: boolean;
  withExif?: boolean;
  withAiAnalysis?: boolean;
  top?: boolean;
  ids?: number[];
}
export class PhotoService {
  private readonly photosBaseUrl = '/photos';
  private appUrl: string;

  constructor(appUrl?: string) {
    this.appUrl = appUrl || process.env.APP_URL || '';
  }

  async checkPhotoExists(originalPath: string) {
    return prisma.photo.findUnique({
      where: { originalPath }
    });
  }

  /** 批量查询，返回已存在的路径集合 */
  async findExistingPaths(originalPaths: string[]): Promise<Set<string>> {
    if (originalPaths.length === 0) return new Set();

    const existing = await prisma.photo.findMany({
      where: { originalPath: { in: originalPaths } },
      select: { originalPath: true }
    });

    return new Set(existing.map((p) => p.originalPath));
  }
  async countAllPhotos() {
    return prisma.photo.count();
  }

  /** 全量查询，仅供管理后台使用 */
  async getAllPhotos() {
    return prisma.photo.findMany({
      orderBy: { takenAt: 'desc' },
      include: {
        photoExif: true,
        location: true,
        photoAiAnalysis: {
          select: {
            id: true,
            photoId: true,
            description: true,
            theme: true,
            tags: true,
            updatedAt: true,
            createdAt: true
          }
        }
      }
    });
  }

  /** 检查文件是否存在于 MinIO */
  async checkFileExists(
    photo: Prisma.PhotoGetPayload<{
      include: { photoExif?: boolean; location?: boolean };
    }>
  ): Promise<{ exists: boolean; key: string }> {
    const key = photo.originalKey;
    if (!key) {
      return { exists: false, key: '' };
    }
    const exists = await checkObjectExists(key);
    return { exists, key };
  }

  /** 批量检查。注意未限制并发，照片多时会同时打出大量 HeadObject 请求 */
  async batchCheckFileExists(
    photos: Prisma.PhotoGetPayload<{
      include: {
        photoExif?: boolean;
        location?: boolean;
        photoAiAnalysis?: boolean;
      };
    }>[]
  ) {
    return Promise.all(
      photos.map(async (photo) => {
        const { exists, key } = await this.checkFileExists(photo);
        return {
          ...photo,
          fileExists: exists,
          fileKey: key
        };
      })
    );
  }

  /** 清理源文件已丢失的照片记录 */
  async deleteMissingPhotos() {
    const photos = await this.getAllPhotos();
    const photosWithStatus = await this.batchCheckFileExists(photos);
    const missingPhotos = photosWithStatus.filter((p) => !p.fileExists);

    const result = { success: 0, failed: 0 };

    for (const photo of missingPhotos) {
      try {
        await this.deletePhoto(photo.id);
        result.success++;
      } catch (error) {
        result.failed++;
        console.warn(`Failed to delete missing photo ${photo.id}:`, error);
      }
    }

    return {
      ...result,
      totalChecked: photos.length,
      missingCount: missingPhotos.length
    };
  }

  /** 删除照片，连带 MinIO 对象与 photos 目录下的源文件，不可恢复 */
  async deletePhoto(id: number) {
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        photoExif: true,
        location: true
      }
    });

    if (!photo) {
      throw new Error('照片不存在');
    }

    // 删除存储中的文件
    const keysToDelete = [
      photo.originalKey,
      photo.thumbSmallKey,
      photo.thumbLargeKey,
      photo.videoKey
    ].filter(Boolean) as string[];

    for (const key of keysToDelete) {
      try {
        await deleteFileFromMinio(key);
      } catch (error) {
        console.warn(`Failed to delete file ${key}:`, error);
      }
    }

    // 删除 photos 目录中的源文件
    await this.deleteSourceFiles(photo.originalPath, !!photo.videoKey);

    // 删除数据库记录（关联记录会级联删除）
    await prisma.photo.delete({
      where: { id }
    });

    return { success: true, message: '删除成功' };
  }

  /**
   * 删除 photos 目录中的源文件（图片 + 可能的 Live Photo 视频）
   * @param originalPath 源图片绝对路径
   * @param hasVideo 是否存在配对视频
   */
  private async deleteSourceFiles(originalPath: string, hasVideo: boolean) {
    // 删除源图片
    try {
      await fs.promises.unlink(originalPath);
    } catch (error: any) {
      // 文件不存在时忽略，其它错误打印警告
      if (error?.code !== 'ENOENT') {
        console.warn(`删除源图片失败 ${originalPath}:`, error);
      }
    }

    if (!hasVideo) return;

    // Live Photo：删除同名的配对视频（扩展名大小写不敏感）
    const dir = path.dirname(originalPath);
    const baseName = path.basename(originalPath, path.extname(originalPath));

    let dirFiles: string[] = [];
    try {
      dirFiles = await fs.promises.readdir(dir);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn(`读取目录失败 ${dir}:`, error);
      }
      return;
    }

    const videoFiles = dirFiles.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, path.extname(file));
      return (
        name === baseName &&
        (VIDEO_EXTENSIONS as readonly string[]).includes(ext)
      );
    });

    for (const file of videoFiles) {
      const videoPath = path.join(dir, file);
      try {
        await fs.promises.unlink(videoPath);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          console.warn(`删除源视频失败 ${videoPath}:`, error);
        }
      }
    }
  }

  async createPhoto(photo: Prisma.PhotoCreateManyInput) {
    return prisma.photo.create({
      data: photo
    });
  }

  async updatePhotoTop(id: number, top: boolean) {
    return prisma.photo.update({
      where: { id },
      data: { top }
    });
  }

  async updatePhoto(photo: Prisma.PhotoUpdateInput, id: number) {
    return prisma.photo.update({
      where: { id },
      data: photo
    });
  }
  /** 分页查询。关联表按需 include，避免默认带出两个 rawData 大字段 */

  async listPhotos({
    page = 1,
    pageSize = 20,
    keyword = '',
    withLocation = false,
    withExif = false,
    withAiAnalysis = false,
    top = false,
    ids = []
  }: ListPhotosInput = {}) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.PhotoWhereInput = {};
    if (keyword) {
      where.OR = [{ filename: { contains: keyword, mode: 'insensitive' } }];
    }
    if (ids.length > 0) {
      where.id = { in: ids };
    }
    if (top) {
      where.top = true;
    }
    const [total, list] = await prisma.$transaction([
      prisma.photo.count({ where: where }),
      prisma.photo.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { takenAt: 'desc' },
        include: {
          location: withLocation,
          photoExif: withExif,
          photoAiAnalysis: withAiAnalysis
            ? {
                select: {
                  id: true,
                  photoId: true,
                  description: true,
                  theme: true,
                  tags: true
                }
              }
            : false
        }
      })
    ]);

    // 转换数据，生成完整 URL
    const transformedList = await Promise.all(
      list.map((photo) => this.transformPhoto(photo))
    );

    return { total, list: transformedList };
  }

  async getPhotoById(id: number) {
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        photoExif: true, // 默认包含 EXIF 信息
        location: true,
        photoAiAnalysis: true
      }
    });

    if (!photo) return null;

    return await this.transformPhoto(photo);
  }

  async getExifByPhotoId(photoId: number) {
    return prisma.photoExif.findUnique({
      where: { photoId }
    });
  }

  async getPhotosInBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ) {
    // 1. 先查出范围内的 photoId
    const locations = await prisma.location.findMany({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLng, lte: maxLng }
      },
      select: {
        photoId: true
      }
    });

    if (locations.length === 0) {
      return [];
    }

    const photoIds = locations.map((l) => l.photoId);

    // 2. 查照片详情
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      orderBy: { takenAt: 'desc' }
    });

    return photos.map((photo) => this.transformPhoto(photo));
  }

  async getPhotosByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        photoExif: true,
        location: true,
        // 与 getPhotoById 取齐：查看器要显示标签，缺了这个关联标签一直是空的
        photoAiAnalysis: true
      }
    });

    // 保持输入 ID 的顺序
    const result = await Promise.all(
      photos.map(async (p) => {
        return await this.transformPhoto(p);
      })
    );

    return result;
  }

  /**
   * 转换照片数据，处理 URL
   */
  private async transformPhoto(
    photo: Prisma.PhotoGetPayload<{
      include?: {
        photoExif?: boolean;
        location?: boolean;
        photoAiAnalysis?: boolean;
      };
    }>
  ) {
    const transformed = { ...photo } as any;
    // 处理缩略图 URL
    if (photo.thumbSmallKey) {
      transformed.thumbSmallUrl = await getImageUrl(photo.thumbSmallKey);
    }
    if (photo.thumbLargeKey) {
      transformed.thumbLargeUrl = await getImageUrl(photo.thumbLargeKey);
    }

    // 处理视频 URL
    if (transformed.videoKey) {
      transformed.videoUrl = await getImageUrl(transformed.videoKey);
    }

    if (transformed.photoExif) {
      // 排除 rawData 字段以减小响应体积
      const { rawData, ...rest } = transformed.photoExif;
      transformed.photoExif = rest as any;
    }

    if (transformed.locations) {
      // 排除 rawData 字段以减小响应体积
      const { rawData, ...rest } = transformed.locations;
      transformed.locations = rest as any;
    }

    delete transformed.thumbSmallKey;
    delete transformed.thumbLargeKey;
    delete transformed.videoKey;

    return transformed;
  }
}
