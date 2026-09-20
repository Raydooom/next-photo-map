import 'server-only';

import { prisma, Prisma } from '@/server/infra/db';
import type { PhotoExif } from '@prisma/client';

class PhotoExifService {
  async savePhotoExif(photoId: number, exifData: any) {
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
  }

  async getPhotoExifById(id: number): Promise<PhotoExif | null> {
    return await prisma.photoExif.findUnique({
      where: { id }
    });
  }

  /** withRawData 为假时剔除 rawData，它是完整的原始 EXIF，体积不小 */
  async getPhotoExifByPhotoId(
    photoId: number,
    withRawData = false
  ): Promise<Partial<PhotoExif> | null> {
    const data = await prisma.photoExif.findUnique({
      where: { photoId }
    });

    if (withRawData) return data;

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rawData, ...rest } = data;
      return rest;
    }

    return null;
  }

  async getAllPhotoExif(): Promise<PhotoExif[]> {
    return await prisma.photoExif.findMany();
  }

  async deletePhotoExifByPhotoId(photoId: number): Promise<{ count: number }> {
    return await prisma.photoExif.deleteMany({
      where: { photoId }
    });
  }
}

/** 进程级单例，class 不导出 */
export const photoExifService = new PhotoExifService();
