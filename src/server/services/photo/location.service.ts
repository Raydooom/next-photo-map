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
 * 把关联出来的 region 字段摊平到 location 上，使调用方仍能读
 * `location.city`。区划已规范化到独立表，但调用点分布在九处组件里，
 * 摊平比逐个改成 `location.region.city` 更省事，也不必改前端类型。
 */
const flattenRegion = <T extends { region?: unknown } | Record<string, any>>(
  row: T
): any => {
  const { region, ...rest } = row as any;
  return region ? { ...rest, ...region } : rest;
};

/**
 * 位置服务 - 提供 location 数据表的增删改查操作
 */
export const locationService = {
  /**
   * 写入位置。调用方仍传扁平的区划字段（country / province / city / district），
   * 由本方法拆出来 upsert 进 regions，locations 只留 adcode 外键。
   *
   * 两次写入包在事务里：region 缺失会让 location 的外键失败，
   * 分开执行可能留下"有 location 无 region"的中间态。
   */
  saveLocation: async (photoId: number, location: any) => {
    const { country, province, city, district, adcode, ...rest } = location;
    const region = { country, province, city, district };
    const hasRegion = Boolean(adcode);

    return await prisma.$transaction(async (tx) => {
      if (hasRegion) {
        await tx.region.upsert({
          where: { adcode },
          update: region,
          create: { adcode, ...region }
        });
      }

      const data = {
        ...rest,
        adcode: hasRegion ? adcode : null,
        rawData: location.rawData ?? Prisma.JsonNull
      };

      return await tx.location.upsert({
        where: { photoId },
        update: data,
        create: { photoId, ...data }
      });
    });
  },
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
    // 区划字段已移到 regions，调用方 select 它们时要转成关联查询
    const { country, province, city, district, ...ownSelect } = select as any;
    const regionKeys = { country, province, city, district };
    const wantsRegion = Object.values(regionKeys).some(Boolean);
    const hasSelect = Object.keys(ownSelect).length > 0 || wantsRegion;

    // select 与 include 互斥，分两条分支写，类型才推导得出来
    const rows = hasSelect
      ? await prisma.location.findMany({
          select: {
            ...ownSelect,
            ...(wantsRegion
              ? {
                  region: {
                    select: Object.fromEntries(
                      Object.entries(regionKeys).filter(([, v]) => v)
                    )
                  }
                }
              : {})
          }
        })
      : await prisma.location.findMany({
          include: {
            region: true,
            ...(withThumb
              ? {
                  photo: {
                    select: {
                      id: true,
                      thumbSmallKey: true,
                      width: true,
                      height: true
                    }
                  }
                }
              : {})
          }
        });

    return (rows as any[]).map(flattenRegion);
  },

  /**
   * 去重后的城市数与省份数。
   *
   * 规范化之前这是把全部位置记录拉到 Node 里 `new Set(...)` 算的 ——
   * 为一个数字传输上千行。现在直接在 regions 上聚合，那张表只有区划数量级。
   */
  countDistinctRegions: async (): Promise<{
    cities: number;
    provinces: number;
  }> => {
    const [row] = await prisma.$queryRaw<
      { cities: bigint; provinces: bigint }[]
    >`
      SELECT COUNT(DISTINCT r."city")::bigint     AS cities,
             COUNT(DISTINCT r."province")::bigint AS provinces
      FROM "regions" r
      WHERE EXISTS (SELECT 1 FROM "locations" l WHERE l."adcode" = r."adcode")
    `;

    return {
      cities: Number(row?.cities ?? 0),
      provinces: Number(row?.provinces ?? 0)
    };
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

  countLocations: async (): Promise<number> => {
    return await prisma.location.count();
  }
};
