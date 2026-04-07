import { Prisma, prisma } from '../lib/db';
import type { locations } from '@prisma/client';

/**
 * 位置服务 - 提供 locations 数据表的增删改查操作
 */
export const locationService = {
  /**
   * 创建位置记录
   */
  saveLocation: async (photoId: number, location: any) => {
    return await prisma.locations.upsert({
      where: { photoId },
      update: {
        ...location,
        rawData: location.rawData ?? Prisma.JsonNull
      },
      create: {
        photoId,
        ...location,
        rawData: location.rawData ?? Prisma.JsonNull
      }
    });
  },
  /**
   * 根据 ID 获取位置记录
   */
  getLocationById: async (id: number): Promise<locations | null> => {
    return await prisma.locations.findUnique({
      where: { id }
    });
  },

  /**
   * 根据 photoId 获取位置记录
   */
  getLocationByPhotoId: async (photoId: number): Promise<locations | null> => {
    return await prisma.locations.findUnique({
      where: { photoId }
    });
  },

  /**
   * 获取所有位置记录
   */
  getAllLocations: async (): Promise<locations[]> => {
    return await prisma.locations.findMany();
  },

  /**
   * 根据地理范围查询位置
   */
  getLocationsByGeoRange: async (
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): Promise<locations[]> => {
    return await prisma.locations.findMany({
      where: {
        latitude: {
          gte: minLat,
          lte: maxLat
        },
        longitude: {
          gte: minLng,
          lte: maxLng
        }
      }
    });
  },

  /**
   * 删除位置记录
   */
  deleteLocation: async (id: number): Promise<locations> => {
    return await prisma.locations.delete({
      where: { id }
    });
  },

  /**
   * 根据 photoId 删除位置记录
   */
  deleteLocationByPhotoId: async (photoId: number): Promise<locations> => {
    return await prisma.locations.delete({
      where: { photoId }
    });
  },

  /**
   * 统计位置数量
   */
  countLocations: async (): Promise<number> => {
    return await prisma.locations.count();
  }
};
