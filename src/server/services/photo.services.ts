import { prisma, Prisma } from '../lib/db';
import { getImageUrl } from '@/server/lib/oss';

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
   * 创建照片照片
   * @param photos 照片数据
   */
  async createPhoto(photo: Prisma.photosCreateManyInput) {
    return prisma.photos.create({
      data: photo
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
  async listPhotos(
    page: number = 1,
    pageSize: number = 20,
    keyword?: string,
    select?: Prisma.photosSelect
  ) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.photosWhereInput = {};
    if (keyword) {
      where.OR = [
        { filename: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { tags: { has: keyword } }
      ];
    }
    const [total, list] = await prisma.$transaction([
      prisma.photos.count({ where }),
      prisma.photos.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { takenAt: 'desc' },
        select: select // 如果未定义，则返回所有字段
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

  // /**
  //  * 获取所有包含地理位置信息的照片（用于地图展示）
  //  */
  // async getPhotosWithLocation() {
  //   const photos = await prisma.photos.findMany({
  //     where: {
  //       locations: {
  //         isNot: null
  //       }
  //     },
  //     select: {
  //       id: true,
  //       takenAt: true,
  //       locations: {
  //         select: {
  //           latitude: true,
  //           longitude: true,
  //           GPSLatitude: true,
  //           GPSLongitude: true,
  //           altitude: true,
  //           bearing: true,
  //           bearingDirection: true,
  //           country: true,
  //           province: true,
  //           city: true,
  //           district: true,
  //           township: true,
  //           adcode: true,
  //           formattedAddress: true,
  //           neighborhood: true,
  //           type: true
  //         }
  //       }
  //     }
  //   });

  //   return photos.map(photo => {
  //     const transformed = this.transformPhoto({ ...photo }); // 浅拷贝以避免副作用
  //     return {
  //       id: transformed.id,
  //       thumbnail: transformed.smallThumbnail,
  //       latitude: transformed.locations?.latitude,
  //       longitude: transformed.locations?.longitude,
  //       bearing: transformed.locations?.bearing,
  //       GPSLatitude: transformed.locations?.GPSLatitude,
  //       GPSLongitude: transformed.locations?.GPSLongitude,
  //       address: transformed.locations?.address,
  //       country: transformed.locations?.country,
  //       province: transformed.locations?.province,
  //       city: transformed.locations?.city,
  //       district: transformed.locations?.district,
  //       town: transformed.locations?.town,
  //       street: transformed.locations?.street,
  //       adcode: transformed.locations?.adcode,
  //       takenAt: transformed.takenAt
  //     };
  //   });
  // }

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
   * 根据图片id删除图片的exif数据
   */
  async deletePhotoExif(photoId: number) {
    return prisma.photoExif.deleteMany({ where: { photoId } });
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
