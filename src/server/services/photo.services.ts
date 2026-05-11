import { prisma, Prisma } from '../lib/db';
import {
  getImageUrl,
  deleteFileFromMinio,
  checkObjectExists
} from '@/server/lib/oss';

export class PhotoService {
  private readonly photosBaseUrl = '/photos';
  private appUrl: string;

  constructor(appUrl?: string) {
    this.appUrl = appUrl || process.env.APP_URL || '';
  }
  /**
   * 查询照片是否存在
   * @param originalPath 照片原始路径
   */
  async checkPhotoExists(originalPath: string) {
    return prisma.photos.findUnique({
      where: { originalPath }
    });
  }
  /**
   * 获取所有照片数量
   */
  async countAllPhotos() {
    return prisma.photos.count();
  }

  /**
   * 获取所有照片列表（用于管理后台）
   */
  async getAllPhotos() {
    return prisma.photos.findMany({
      orderBy: { takenAt: 'desc' },
      include: {
        photoExif: true,
        locations: true
      }
    });
  }

  /**
   * 检查照片文件是否存在于 MinIO
   */
  async checkFileExists(
    photo: Prisma.photosGetPayload<{
      include: { photoExif?: boolean; locations?: boolean };
    }>
  ): Promise<{ exists: boolean; key: string }> {
    const key = photo.originalKey;
    if (!key) {
      return { exists: false, key: '' };
    }
    const exists = await checkObjectExists(key);
    return { exists, key };
  }

  /**
   * 批量检查文件是否存在于 MinIO
   */
  async batchCheckFileExists(
    photos: Prisma.photosGetPayload<{
      include: { photoExif?: boolean; locations?: boolean };
    }>[]
  ) {
    return Promise.all(
      photos.map(async photo => {
        const { exists, key } = await this.checkFileExists(photo);
        return {
          ...photo,
          fileExists: exists,
          fileKey: key
        };
      })
    );
  }

  /**
   * 删除照片（包括数据库记录和存储文件）
   */
  async deletePhoto(id: number) {
    const photo = await prisma.photos.findUnique({
      where: { id },
      include: {
        photoExif: true,
        locations: true
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

    // 删除数据库记录（关联记录会级联删除）
    await prisma.photos.delete({
      where: { id }
    });

    return { success: true, message: '删除成功' };
  }
  /**
   * 创建照片照片
   * @param photos 照片数据
   */
  async createPhoto(photo: Prisma.photosCreateManyInput) {
    return prisma.photos.create({
      data: photo
    });
  }

  /**
   * 更新照片置顶状态
   * @param id 照片ID
   * @param top 是否置顶
   */
  async updatePhotoTop(id: number, top: boolean) {
    return prisma.photos.update({
      where: { id },
      data: { top }
    });
  }
  /**
   * 更新照片标签
   * @param id 照片ID
   * @param tags 标签数组
   */
  async updatePhotoTags(id: number, tags: string[]) {
    return prisma.photos.update({
      where: { id },
      data: { tags }
    });
  }

  /**
   * 更新照片照片
   * @param photo 照片数据
   */
  async updatePhoto(photo: Prisma.photosUpdateInput, id: number) {
    return prisma.photos.update({
      where: { id },
      data: photo
    });
  }
  /**
   * 获取照片列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param keyword 搜索关键词
   * @param select 可选的字段选择
   */
  async listPhotos({
    page = 1,
    pageSize = 20,
    keyword = '',
    withLocation = false,
    withExif = false,
    top = false
  } = {}) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.photosWhereInput = {};
    if (keyword) {
      where.OR = [
        { filename: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { tags: { has: keyword } }
      ];
    }
    if (top) {
      where.top = true;
    }
    const [total, list] = await prisma.$transaction([
      prisma.photos.count({ where: where }),
      prisma.photos.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { takenAt: 'desc' },
        include: {
          locations: withLocation,
          photoExif: withExif
        }
      })
    ]);

    // 转换数据，生成完整 URL
    const transformedList = await Promise.all(
      list.map(photo => this.transformPhoto(photo))
    );

    return { total, list: transformedList };
  }

  /**
   * 获取单张照片详情
   * @param id 照片ID
   */
  async getPhotoById(id: number) {
    const photo = await prisma.photos.findUnique({
      where: { id },
      include: {
        photoExif: true // 默认包含 EXIF 信息
      }
    });

    if (!photo) return null;

    return await this.transformPhoto(photo);
  }

  /**
   * 获取照片的 EXIF 信息
   * @param photoId 照片ID
   */
  async getExifByPhotoId(photoId: number) {
    return prisma.photoExif.findUnique({
      where: { photoId }
    });
  }

  /**
   * 获取指定地理范围内的照片
   */
  async getPhotosInBounds(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ) {
    // 1. 先查出范围内的 photoId
    const locations = await prisma.locations.findMany({
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

    const photoIds = locations.map(l => l.photoId);

    // 2. 查照片详情
    const photos = await prisma.photos.findMany({
      where: { id: { in: photoIds } },
      orderBy: { takenAt: 'desc' }
    });

    return photos.map(photo => this.transformPhoto(photo));
  }

  /**
   * 批量获取照片详情
   */
  async getPhotosByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const photos = await prisma.photos.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        photoExif: true,
        locations: true
      }
    });

    // 保持输入 ID 的顺序
    const result = await Promise.all(
      photos.map(async p => {
        return await this.transformPhoto(p);
      })
    );

    return result;
  }

  /**
   * 转换照片数据，处理 URL
   */
  private async transformPhoto(
    photo: Prisma.photosGetPayload<{
      include?: {
        photoExif?: boolean;
        locations?: boolean;
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
