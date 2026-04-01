import { prisma, Prisma } from '../lib/db';

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
   * 创建照片照片
   * @param photos 照片数据
   */
  async createPhotos(photos: Prisma.photosCreateManyInput[]) {
    return prisma.photos.createMany({
      data: photos
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
    const transformedList = list.map(photo => this.transformPhoto(photo));

    return { total, list: transformedList };
  }

  /**
   * 获取单张照片详情
   * @param id 照片ID
   */
  async getPhotoById(id: number) {
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        exif: true // 默认包含 EXIF 信息
      }
    });

    if (!photo) return null;

    return this.transformPhoto(photo);
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
   * 获取所有包含地理位置信息的照片（用于地图展示）
   */
  async getPhotosWithLocation() {
    const photos = await prisma.photos.findMany({
      where: {
        location: {
          isNot: null
        }
      },
      select: {
        id: true,
        smallThumbnail: true,
        takenAt: true,
        location: {
          select: {
            latitude: true,
            longitude: true,
            bearing: true,
            latitudeDMS: true,
            longitudeDMS: true,
            address: true,
            country: true,
            province: true,
            city: true,
            district: true,
            town: true,
            street: true,
            adcode: true
          }
        }
      }
    });

    return photos.map(photo => {
      const transformed = this.transformPhoto({ ...photo }); // 浅拷贝以避免副作用
      return {
        id: transformed.id,
        thumbnail: transformed.smallThumbnail,
        latitude: transformed.location?.latitude,
        longitude: transformed.location?.longitude,
        bearing: transformed.location?.bearing,
        latitudeDMS: transformed.location?.latitudeDMS,
        longitudeDMS: transformed.location?.longitudeDMS,
        address: transformed.location?.address,
        country: transformed.location?.country,
        province: transformed.location?.province,
        city: transformed.location?.city,
        district: transformed.location?.district,
        town: transformed.location?.town,
        street: transformed.location?.street,
        adcode: transformed.location?.adcode,
        takenAt: transformed.takenAt
      };
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
    const locations = await this.prisma.photoLocation.findMany({
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
    const photos = await this.prisma.photo.findMany({
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

    const photos = await this.prisma.photo.findMany({
      where: {
        id: { in: ids }
      },
      include: {
        exif: true,
        location: true
      }
    });

    // 保持输入 ID 的顺序
    const photoMap = new Map(
      photos.map(p => {
        const transformed = this.transformPhoto(p);
        if (transformed.exif) {
          // 排除 rawData 字段以减小响应体积
          const { rawData, ...rest } = transformed.exif;
          transformed.exif = rest as any;
        }
        return [p.id, transformed];
      })
    );
    const result = ids
      .map(id => photoMap.get(id))
      .filter(item => item !== undefined);

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
  private transformPhoto(photo: any) {
    // 处理缩略图 URL
    if (photo.smallThumbnail && !photo.smallThumbnail.startsWith('http')) {
      photo.smallThumbnail = `${this.appUrl}${photo.smallThumbnail}`;
    }
    if (photo.largeThumbnail && !photo.largeThumbnail.startsWith('http')) {
      photo.largeThumbnail = `${this.appUrl}${photo.largeThumbnail}`;
    }

    // 处理视频 URL
    if (photo.videoPath && !photo.videoPath.startsWith('http')) {
      // 确保路径分隔符正确 (Windows/Unix 兼容)
      // videoPath 在 DB 中存储的是相对路径，如 "2023/12/video.mp4"
      // URL 应该是 http://host/photos/2023/12/video.mp4
      // 注意：如果 videoPath 包含反斜杠（Windows），需要替换为正斜杠
      const normalizedPath = photo.videoPath.replace(/\\/g, '/');
      photo.videoPath = `${this.appUrl}${this.photosBaseUrl}/${normalizedPath}`;
    }
    return photo;
  }
}
