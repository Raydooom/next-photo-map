import { prisma, Prisma } from '../lib/db';
import type { PhotoExif } from '@prisma/client';

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
  getPhotoExifById: async (id: number): Promise<PhotoExif | null> => {
    return await prisma.photoExif.findUnique({
      where: { id }
    });
  },

  /**
   * 根据 photoId 获取EXIF记录
   */
  getPhotoExifByPhotoId: async (
    photoId: number,
    withRawData = false
  ): Promise<Partial<PhotoExif> | null> => {
    const data = await prisma.photoExif.findUnique({
      where: { photoId }
    });
    if (withRawData) return data;
    if (data) {
      // 使用解构赋值剔除字段
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rawData, ...rest } = data;
      // 如果 withRawData 为 false，rawData 本来就是 undefined，rest 就是你要的结果
      return rest;
    }
    return null;
  },

  /**
   * 获取所有EXIF记录
   */
  getAllPhotoExif: async (): Promise<PhotoExif[]> => {
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
  }
};
