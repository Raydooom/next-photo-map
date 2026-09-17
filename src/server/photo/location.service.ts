import 'server-only';

import { Prisma, prisma } from '@/server/infra/db';
import { getImageUrl } from '@/server/infra/storage';
import type { Location } from '@prisma/client';

/** listLocations 带 withThumb 时的返回形状 */
interface LocationWithThumb {
  photo?: {
    id: number;
    thumbSmallKey: string | null;
    width: number | null;
    height: number | null;
  } | null;
  [key: string]: unknown;
}

/**
 * 位置服务 - 提供 location 数据表的增删改查操作
 */
export const locationService = {
  /**
   * 创建位置记录
   */
  saveLocation: async (photoId: number, location: any) => {
    return await prisma.location.upsert({
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
  getLocationById: async (id: number): Promise<Location | null> => {
    return await prisma.location.findUnique({
      where: { id }
    });
  },

  /**
   * 根据 photoId 获取位置记录
   */
  getLocationByPhotoId: async (photoId: number): Promise<Location | null> => {
    return await prisma.location.findUnique({
      where: { photoId }
    });
  },

  /**
   * 获取所有位置记录
   *
   * @param withThumb 一并取出所属照片的缩略图键与尺寸。
   *   地图标记要显示照片本身，而位置表只有坐标与行政区。
   *   与 select 互斥：给了 select 即为精确取字段，不再附加关联。
   */
  getAllLocations: async ({
    select = {},
    withThumb = false
  }: {
    select?: Record<string, unknown>;
    withThumb?: boolean;
  } = {}): Promise<Location[] | any> => {
    // 判断对象是否为空
    const hasSelect = Object.keys(select).length > 0;
    return await prisma.location.findMany({
      ...(hasSelect ? { select } : {}),
      ...(!hasSelect && withThumb
        ? {
            include: {
              photo: {
                select: {
                  id: true,
                  thumbSmallKey: true,
                  width: true,
                  height: true
                }
              }
            }
          }
        : {})
    });
  },

  /**
   * 获取所有位置记录，并把缩略图存储键换成带签名的可访问地址。
   * 签名在服务端完成，存储键不外泄。
   */
  listLocations: async ({
    select = {},
    withThumb = false
  }: {
    select?: Record<string, unknown>;
    withThumb?: boolean;
  } = {}) => {
    const list = await locationService.getAllLocations({ select, withThumb });

    if (!withThumb) return list;

    return await Promise.all(
      (list as LocationWithThumb[]).map(async (item) => ({
        ...item,
        photo: item.photo
          ? {
              ...item.photo,
              thumbSmallUrl: item.photo.thumbSmallKey
                ? await getImageUrl(item.photo.thumbSmallKey)
                : null
            }
          : null
      }))
    );
  },

  /**
   * 根据地理范围查询位置
   */
  getLocationsByGeoRange: async (
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): Promise<Location[]> => {
    return await prisma.location.findMany({
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
  deleteLocation: async (id: number): Promise<Location> => {
    return await prisma.location.delete({
      where: { id }
    });
  },

  /**
   * 根据 photoId 删除位置记录
   */
  deleteLocationByPhotoId: async (photoId: number): Promise<Location> => {
    return await prisma.location.delete({
      where: { photoId }
    });
  },

  /**
   * 统计位置数量
   */
  countLocations: async (): Promise<number> => {
    return await prisma.location.count();
  }
};
