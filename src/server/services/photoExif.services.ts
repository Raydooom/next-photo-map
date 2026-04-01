import { prisma, Prisma } from '../lib/db';
import type { photoExif } from '@prisma/client';

/**
 * 照片EXIF服务 - 提供 photoExif 数据表的增删改查操作
 */
export const photoExifService = {
  /**
   * 创建EXIF记录
   */
  savePhotoExif: async (photoId: number, exifData: any) => {
    return await prisma.photoExif.upsert({
      where: { photoId },
      update: {
        ...exifData,
        rawData: exifData.rawData ?? Prisma.JsonNull
      },
      create: {
        photoId,
        ...exifData,
        rawData: exifData.rawData ?? Prisma.JsonNull
      }
    });
  },

  /**
   * 根据 ID 获取EXIF记录
   */
  getPhotoExifById: async (id: number): Promise<photoExif | null> => {
    return await prisma.photoExif.findUnique({
      where: { id }
    });
  },

  /**
   * 根据 photoId 获取EXIF记录
   */
  getPhotoExifByPhotoId: async (photoId: number): Promise<photoExif | null> => {
    return await prisma.photoExif.findUnique({
      where: { photoId }
    });
  },

  /**
   * 获取所有EXIF记录
   */
  getAllPhotoExifs: async (): Promise<photoExif[]> => {
    return await prisma.photoExif.findMany();
  },

  /**
   * 根据 photoId 删除EXIF记录
   */
  deletePhotoExifByPhotoId: async (
    photoId: number
  ): Promise<{ count: number }> => {
    return await prisma.photoExif.deleteMany({
      where: { photoId }
    });
  },

  /**
   * 统计EXIF记录数量
   */
  countPhotoExifs: async (): Promise<number> => {
    return await prisma.photoExif.count();
  }
};
