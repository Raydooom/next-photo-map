import 'server-only';

import { prisma, Prisma } from '@/server/infra/db';
import {
  getImageUrl,
  deleteFileFromMinio,
  checkObjectExists
} from '@/server/infra/storage';
import fs from 'fs';
import path from 'path';
import { VIDEO_EXTENSIONS } from '@/server/services/ingestion/photo-files';
import type { PhotoItem } from '@/lib/types';

/**
 * transformPhoto 的输入：照片行本身，关联表按需带上。
 * 各查询 include 的组合不同（有的用 select 只取几个字段），故关联部分
 * 宽松处理，由 transformPhoto 内部按存在性剥离。
 */
type PhotoRow = Prisma.PhotoGetPayload<{}> & Record<string, unknown>;

interface TakenAtRange {
  /** 起始时刻，包含 */
  start: Date;
  /** 结束时刻，排除；用半开区间避免日末毫秒精度问题 */
  endExclusive: Date;
}

/**
 * 照片地点筛选：行政区字段属于 Region，街道和地址片段属于 Location。
 * 工具层只传结构化条件；这里统一转为 Prisma 关联查询，避免 Agent 直接访问数据库。
 */
interface LocationSearchFilter {
  province?: string;
  city?: string;
  district?: string;
  township?: string;
  keyword?: string;
}

interface NumericRange {
  min?: number;
  max?: number;
}

/** 非向量 AI 元数据筛选，依赖已有 tags/theme/description 字段。 */
interface AiMetadataSearchFilter {
  tagsAny?: string[];
  tagsAll?: string[];
  tagsExclude?: string[];
  theme?: string;
  descriptionKeyword?: string;
}

/** 可直接由现有原生数值 EXIF 列支持的摄影参数筛选。 */
interface ExifSearchFilter {
  camera?: string;
  lens?: string;
  fNumber?: NumericRange;
  iso?: NumericRange;
  focalLength?: NumericRange;
  flashMode?: 'fired' | 'not_fired';
}

interface ListPhotosInput {
  page?: number;
  pageSize?: number;
  keyword?: string;
  withLocation?: boolean;
  withExif?: boolean;
  withAiAnalysis?: boolean;
  top?: boolean;
  ids?: number[];
  takenAtRange?: TakenAtRange;
  locationFilter?: LocationSearchFilter;
  aiMetadataFilter?: AiMetadataSearchFilter;
  exifFilter?: ExifSearchFilter;
}

function normalizeLocationTerm(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function createLocationFilter(
  input: LocationSearchFilter
): Prisma.LocationWhereInput | null {
  const province = normalizeLocationTerm(input.province);
  const city = normalizeLocationTerm(input.city);
  const district = normalizeLocationTerm(input.district);
  const township = normalizeLocationTerm(input.township);
  const keyword = normalizeLocationTerm(input.keyword);

  const region: Prisma.RegionWhereInput = {};
  if (province) region.province = { equals: province, mode: 'insensitive' };
  if (city) region.city = { equals: city, mode: 'insensitive' };
  if (district) region.district = { equals: district, mode: 'insensitive' };

  const location: Prisma.LocationWhereInput = {};
  if (Object.keys(region).length > 0) {
    location.region = { is: region };
  }
  if (township) {
    location.township = { contains: township, mode: 'insensitive' };
  }
  if (keyword) {
    const textFilter = { contains: keyword, mode: 'insensitive' } as const;
    location.OR = [
      { township: textFilter },
      { formattedAddress: textFilter },
      { neighborhood: textFilter }
    ];
  }

  return Object.keys(location).length > 0 ? location : null;
}

function normalizeTerms(values?: string[]) {
  if (!values) return [];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/**
 * Agent 选择的字段是查询提示，不是严格的物理列限定。
 * 同一个视觉词应同时命中标签、主题或描述，避免模型传 theme 时漏掉标签中的同词。
 */
function createAiMetadataTermFilter(
  term: string
): Prisma.PhotoAiAnalysisWhereInput {
  const textFilter = { contains: term, mode: 'insensitive' } as const;

  return {
    OR: [
      { tags: { has: term } },
      { theme: textFilter },
      { description: textFilter }
    ]
  };
}

function createAiMetadataFilter(
  input: AiMetadataSearchFilter
): Prisma.PhotoAiAnalysisWhereInput | null {
  const tagsAny = normalizeTerms(input.tagsAny);
  const tagsAll = normalizeTerms(input.tagsAll);
  const tagsExclude = normalizeTerms(input.tagsExclude);
  const theme = normalizeLocationTerm(input.theme);
  const descriptionKeyword = normalizeLocationTerm(input.descriptionKeyword);
  const conditions: Prisma.PhotoAiAnalysisWhereInput[] = [];

  if (tagsAny.length > 0) {
    conditions.push({ OR: tagsAny.map(createAiMetadataTermFilter) });
  }
  if (tagsAll.length > 0) {
    conditions.push({ AND: tagsAll.map(createAiMetadataTermFilter) });
  }
  if (tagsExclude.length > 0) {
    conditions.push({
      NOT: { OR: tagsExclude.map(createAiMetadataTermFilter) }
    });
  }
  if (theme) conditions.push(createAiMetadataTermFilter(theme));
  if (descriptionKeyword) {
    conditions.push(createAiMetadataTermFilter(descriptionKeyword));
  }

  return conditions.length > 0 ? { AND: conditions } : null;
}

function createRangeFilter(range?: NumericRange) {
  if (!range) return null;

  const filter = {
    ...(range.min !== undefined ? { gte: range.min } : {}),
    ...(range.max !== undefined ? { lte: range.max } : {})
  };

  return Object.keys(filter).length > 0 ? filter : null;
}

function createExifFilter(
  input: ExifSearchFilter
): Prisma.PhotoExifWhereInput | null {
  const camera = normalizeLocationTerm(input.camera);
  const lens = normalizeLocationTerm(input.lens);
  const fNumber = createRangeFilter(input.fNumber);
  const iso = createRangeFilter(input.iso);
  const focalLength = createRangeFilter(input.focalLength);
  const conditions: Prisma.PhotoExifWhereInput[] = [];

  if (camera) {
    const textFilter = { contains: camera, mode: 'insensitive' } as const;
    conditions.push({ OR: [{ make: textFilter }, { model: textFilter }] });
  }
  if (lens) {
    const textFilter = { contains: lens, mode: 'insensitive' } as const;
    conditions.push({ OR: [{ lensMake: textFilter }, { lensModel: textFilter }] });
  }
  if (fNumber) conditions.push({ fNumber });
  if (iso) conditions.push({ iso });
  if (focalLength) conditions.push({ focalLength });
  if (input.flashMode === 'fired') {
    conditions.push({ flash: { contains: 'fired', mode: 'insensitive' } });
  }
  if (input.flashMode === 'not_fired') {
    conditions.push({
      flash: { contains: 'did not fire', mode: 'insensitive' }
    });
  }

  return conditions.length > 0 ? { AND: conditions } : null;
}

class PhotoService {
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
        location: { include: { region: true } },
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

  /** 检查文件是否存在于 MinIO。只用到 originalKey，故不限定完整的行类型 */
  async checkFileExists(photo: {
    originalKey: string | null;
  }): Promise<{ exists: boolean; key: string }> {
    const key = photo.originalKey;
    if (!key) {
      return { exists: false, key: '' };
    }
    const exists = await checkObjectExists(key);
    return { exists, key };
  }

  /** 批量检查。注意未限制并发，照片多时会同时打出大量 HeadObject 请求 */
  async batchCheckFileExists<T extends { originalKey: string | null }>(
    photos: T[]
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

  /**
   * 后台照片列表：过一遍 transformPhoto 拿到签名 URL，再附上文件存在标记。
   *
   * 后台原先直接用 getAllPhotos 的原始行，于是拿到的是存储键、得自己拼
   * `/api/image?key=...`（不带 token）。改走这里之后拿到的是 thumbLargeUrl，
   * 类型也能直接复用 PhotoItem。
   */
  async listAllWithFileStatus() {
    const photos = await this.getAllPhotos();
    const items = await Promise.all(
      photos.map((photo) => this.transformPhoto(photo as PhotoRow))
    );
    return await this.batchCheckFileExists(items);
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
        location: { include: { region: true } }
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
    ids = [],
    takenAtRange,
    locationFilter,
    aiMetadataFilter,
    exifFilter
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
    if (takenAtRange) {
      where.takenAt = {
        gte: takenAtRange.start,
        lt: takenAtRange.endExclusive
      };
    }
    if (locationFilter) {
      const location = createLocationFilter(locationFilter);
      if (location) {
        where.location = { is: location };
      }
    }
    if (aiMetadataFilter) {
      const aiMetadata = createAiMetadataFilter(aiMetadataFilter);
      if (aiMetadata) {
        where.photoAiAnalysis = { is: aiMetadata };
      }
    }
    if (exifFilter) {
      const exif = createExifFilter(exifFilter);
      if (exif) {
        where.photoExif = { is: exif };
      }
    }
    const [total, list] = await prisma.$transaction([
      prisma.photo.count({ where: where }),
      prisma.photo.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { takenAt: 'desc' },
        include: {
          location: withLocation ? { include: { region: true } } : false,
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
        location: { include: { region: true } },
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
        location: { include: { region: true } },
        // 与 getPhotoById 取齐：查看器要显示标签，缺了这个关联标签一直是空的
        photoAiAnalysis: true
      }
    });

    const transformedPhotos = await Promise.all(
      photos.map((photo) => this.transformPhoto(photo))
    );
    const photoById = new Map(
      transformedPhotos.map((photo) => [photo.id, photo])
    );

    return ids
      .map((photoId) => photoById.get(photoId))
      .filter((photo): photo is PhotoItem => Boolean(photo));
  }

  /**
   * 转换照片数据，处理 URL
   */
  private async transformPhoto(
    photo: PhotoRow
  ): Promise<PhotoItem> {
    const {
      thumbSmallKey,
      thumbLargeKey,
      videoKey,
      photoExif,
      location,
      photoAiAnalysis,
      ...rest
    } = photo as PhotoRow & {
      photoExif?: unknown;
      location?: unknown;
      photoAiAnalysis?: unknown;
    };

    // 构造新对象而不是 delete：delete 会让 V8 把对象降级为字典模式，
    // 而这个函数在列表查询里对每一行都要跑一次
    const item: PhotoItem = {
      ...(rest as Omit<PhotoItem, 'thumbSmallUrl' | 'thumbLargeUrl'>),
      thumbSmallUrl: await getImageUrl(thumbSmallKey),
      thumbLargeUrl: await getImageUrl(thumbLargeKey)
    };

    if (videoKey) {
      item.videoUrl = await getImageUrl(videoKey);
    }

    if (photoExif) {
      // rawData 是完整的原始 EXIF，不下发
      const { rawData: _exifRaw, ...exifRest } = photoExif as Record<
        string,
        unknown
      >;
      item.photoExif = exifRest as unknown as PhotoItem['photoExif'];
    }

    if (location) {
      // 剔除 rawData，并把 region 的区划字段摊平上来 ——
      // 调用方读的是 location.city，而它实际存在 regions 表里
      const {
        rawData: _locRaw,
        region,
        ...locRest
      } = location as Record<string, unknown>;
      item.location = {
        ...locRest,
        ...((region as object) ?? {})
      } as unknown as PhotoItem['location'];
    }

    if (photoAiAnalysis) {
      // 两个 vector(1024) 约 8KB，前端用不到；location 是从未写入的死字段
      const {
        embedding: _emb,
        tagEmbedding: _tagEmb,
        location: _aiLoc,
        ...aiRest
      } = photoAiAnalysis as Record<string, unknown>;
      item.photoAiAnalysis =
        aiRest as unknown as PhotoItem['photoAiAnalysis'];
    }

    return item;
  }
}

/**
 * 进程级单例。class 不导出，外部拿不到构造器，也就不会误以为需要 new。
 * 只有带任务级状态的 service（ScannerService）才导出类、由调用方每次新建。
 */
export const photoService = new PhotoService();
