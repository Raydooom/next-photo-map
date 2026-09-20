import type { Prisma, Region } from '@prisma/client';

/**
 * 照片相关的类型全部从 Prisma 派生，不手写。
 *
 * 这里描述的是**下发给前端的形状**，与数据库行不同：`transformPhoto`
 * 会剔除存储键换成签名 URL、剔除两个 rawData、把 region 的区划字段摊平到
 * location 上、并去掉向量字段。每一处变换都在下面的类型里对应表达。
 *
 * 之前这些是手写的 interface，已经和 schema 漂移：声明了运行时不存在的
 * thumbSmallKey、缺少 theme、多出 schema 里没有的 address / street、
 * 还把 Date 类型的 takenAt 写成 string。派生之后这类偏差不可能再发生。
 */

/** 服务端查询形状：照片带三个关联，location 再带 region */
export type PhotoWithRelations = Prisma.PhotoGetPayload<{
  include: {
    photoExif: true;
    location: { include: { region: true } };
    photoAiAnalysis: true;
  };
}>;

/** EXIF。下发时剔除 rawData —— 那是完整的原始 EXIF，体积不小 */
export type PhotoExif = Omit<
  NonNullable<PhotoWithRelations['photoExif']>,
  'rawData'
>;

/**
 * 位置。剔除 rawData，并把 region 的区划字段摊平上来 ——
 * 调用方读的是 `location.city`，而它实际存在 regions 表里。
 * adcode 本就在 location 上，故从摊平的部分排除。
 */
export type PhotoLocation = Omit<
  NonNullable<PhotoWithRelations['location']>,
  'rawData' | 'region'
> &
  Partial<Omit<Region, 'adcode'>>;

/**
 * AI 分析。向量不下发（两个 vector(1024) 共约 8KB，前端用不到），
 * location 是从未写入的死字段。
 */
export type PhotoAiAnalysis = Omit<
  NonNullable<PhotoWithRelations['photoAiAnalysis']>,
  'embedding' | 'tagEmbedding' | 'location'
>;

/** 列表查询只取 AI 分析的这几个字段，不带时间戳 */
export type PhotoAiAnalysisBrief = Pick<
  PhotoAiAnalysis,
  'id' | 'photoId' | 'description' | 'theme' | 'tags'
>;

/**
 * 下发给前端的照片。存储键换成签名 URL：键不外泄，URL 由
 * /api/image 代理 + HMAC token 承载。
 */
export type PhotoItem = Omit<
  PhotoWithRelations,
  | 'thumbSmallKey'
  | 'thumbLargeKey'
  | 'videoKey'
  | 'photoExif'
  | 'location'
  | 'photoAiAnalysis'
> & {
  // schema 里两个缩略图键都是非空的，故 URL 必然生成
  thumbSmallUrl: string;
  thumbLargeUrl: string;
  // videoKey 可空（只有 Live Photo 才有），URL 随之可选
  videoUrl?: string;
  photoExif?: PhotoExif | null;
  location?: PhotoLocation | null;
  photoAiAnalysis?: PhotoAiAnalysisBrief | null;
};
