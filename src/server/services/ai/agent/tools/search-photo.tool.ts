import 'server-only';

import { tool } from '@langchain/core/tools';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';
import type { PhotoItem } from '@/lib/types/photo';
import { semanticPhotoSearchService } from '@/server/services/ai/image-analysis';
import { photoService } from '@/server/services/photo/photo.service';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ARCHIVE_TIME_ZONE = 'Asia/Shanghai';
const CALENDAR_DATE_FORMAT = 'YYYY-MM-DD';
const TEXT_TERM_MAX_LENGTH = 60;
const SEMANTIC_QUERY_MAX_LENGTH = 400;

const photoLimit = z
  .number()
  .int()
  .min(1)
  .max(20)
  .default(12)
  .describe('最多返回 20 张代表照片，默认 12 张；界面以九宫格展示前 9 张。')

const dateSearchInput = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '开始日期必须为 YYYY-MM-DD')
    .describe('包含的起始拍摄日期，格式为 YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '结束日期必须为 YYYY-MM-DD')
    .describe('包含的结束拍摄日期，格式为 YYYY-MM-DD；可与 startDate 相同'),
  limit: photoLimit
});

const locationTerm = z
  .string()
  .trim()
  .min(2, '地点条件至少需要两个字符')
  .max(TEXT_TERM_MAX_LENGTH)
  .optional();

const locationSearchInput = z
  .object({
    province: locationTerm.describe('已识别的完整省级名称，例如“浙江省”或“北京市”'),
    city: locationTerm.describe('已识别的完整城市名称，例如“杭州市”或“北京市”'),
    district: locationTerm.describe('已识别的区县名称，例如“朝阳区”'),
    township: locationTerm.describe('街道、镇或乡名称，例如“建国门街道”'),
    keyword: locationTerm.describe('景区、小区、地标或详细地址片段，例如“奥林匹克森林公园”'),
    limit: photoLimit
  })
  .refine(
    (value) =>
      Boolean(
        value.province ||
          value.city ||
          value.district ||
          value.township ||
          value.keyword
      ),
    { message: '至少提供一个地点条件' }
  );

const textTerm = z
  .string()
  .trim()
  .min(1, '文本条件不能为空')
  .max(TEXT_TERM_MAX_LENGTH)
  .optional();

const tagTerm = z.string().trim().min(1).max(20);

const aiMetadataSearchInput = z
  .object({
    tagsAny: z
      .array(tagTerm)
      .min(1)
      .max(10)
      .optional()
      .describe('任一命中标签，例如“逆光”“雪山”“夜景”'),
    tagsAll: z
      .array(tagTerm)
      .min(1)
      .max(10)
      .optional()
      .describe('必须同时具备的标签'),
    tagsExclude: z
      .array(tagTerm)
      .min(1)
      .max(10)
      .optional()
      .describe('必须排除的标签'),
    theme: textTerm.describe('AI 分析主题中的关键词'),
    descriptionKeyword: textTerm.describe('AI 图片描述中的关键词'),
    limit: photoLimit
  })
  .refine(
    (value) =>
      Boolean(
        value.tagsAny?.length ||
          value.tagsAll?.length ||
          value.tagsExclude?.length ||
          value.theme ||
          value.descriptionKeyword
      ),
    { message: '至少提供一个 AI 元数据条件' }
  );

const semanticPhotoSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(2, '语义查询内容至少需要两个字符')
    .max(SEMANTIC_QUERY_MAX_LENGTH)
    .describe('保留用户原意的中文画面描述，可包含主体关系、动作、空间、氛围或抽象风格'),
  limit: photoLimit
});

const positiveNumber = z.number().finite().positive();
const isoNumber = z.number().int().finite().min(1);

const exifSearchInput = z
  .object({
    camera: textTerm.describe('相机品牌或机身型号，例如“iPhone 16 Pro”'),
    lens: textTerm.describe('镜头品牌、型号或镜头名称'),
    fNumberMin: positiveNumber.optional().describe('最小光圈值，例如 1.8'),
    fNumberMax: positiveNumber.optional().describe('最大光圈值；找大光圈照片时填写目标上限，例如 2.8'),
    isoMin: isoNumber.optional().describe('最小 ISO'),
    isoMax: isoNumber.optional().describe('最大 ISO'),
    focalLengthMin: positiveNumber.optional().describe('最小实际焦距，单位 mm'),
    focalLengthMax: positiveNumber.optional().describe('最大实际焦距，单位 mm'),
    flashMode: z
      .enum(['fired', 'not_fired'])
      .optional()
      .describe('闪光灯状态：fired 为已闪光，not_fired 为未闪光'),
    limit: photoLimit
  })
  .refine(
    (value) =>
      Boolean(
        value.camera ||
          value.lens ||
          value.fNumberMin !== undefined ||
          value.fNumberMax !== undefined ||
          value.isoMin !== undefined ||
          value.isoMax !== undefined ||
          value.focalLengthMin !== undefined ||
          value.focalLengthMax !== undefined ||
          value.flashMode
      ),
    { message: '至少提供一个 EXIF 条件' }
  )
  .refine(
    (value) =>
      value.fNumberMin === undefined ||
      value.fNumberMax === undefined ||
      value.fNumberMin <= value.fNumberMax,
    { message: '最小光圈值不能大于最大光圈值' }
  )
  .refine(
    (value) =>
      value.isoMin === undefined ||
      value.isoMax === undefined ||
      value.isoMin <= value.isoMax,
    { message: '最小 ISO 不能大于最大 ISO' }
  )
  .refine(
    (value) =>
      value.focalLengthMin === undefined ||
      value.focalLengthMax === undefined ||
      value.focalLengthMin <= value.focalLengthMax,
    { message: '最小焦距不能大于最大焦距' }
  );

type DateSearchInput = z.infer<typeof dateSearchInput>;
type LocationSearchInput = z.infer<typeof locationSearchInput>;
type AiMetadataSearchInput = z.infer<typeof aiMetadataSearchInput>;
type SemanticPhotoSearchInput = z.infer<typeof semanticPhotoSearchInput>;
type ExifSearchInput = z.infer<typeof exifSearchInput>;

/**
 * 用户说的是日历日，数据库筛选使用半开时刻区间。
 * 例如 2025-10-01 至 2025-10-01 会查询上海时区当天的 [00:00, 次日 00:00)。
 */
function createTakenAtRange({ startDate, endDate }: DateSearchInput) {
  const start = dayjs.tz(startDate, CALENDAR_DATE_FORMAT, ARCHIVE_TIME_ZONE);
  const end = dayjs.tz(endDate, CALENDAR_DATE_FORMAT, ARCHIVE_TIME_ZONE);

  if (
    !start.isValid() ||
    !end.isValid() ||
    start.format(CALENDAR_DATE_FORMAT) !== startDate ||
    end.format(CALENDAR_DATE_FORMAT) !== endDate
  ) {
    throw new Error('日期必须是有效的 YYYY-MM-DD 日历日期');
  }

  if (end.isBefore(start, 'day')) {
    throw new Error('结束日期不能早于开始日期');
  }

  return {
    start: start.startOf('day').toDate(),
    endExclusive: end.add(1, 'day').startOf('day').toDate()
  };
}

/**
 * 工具结果只给模型 id 与一组短标签，不含描述、文件名、时间、地点与 EXIF。
 *
 * 这些字段模型一个都用不到：界面靠 id 取照片，回答正文在有照片时会被服务端
 * 换成固定摘要，system prompt 也禁止它输出时间、地点、参数与文件名。
 * 但它们要占掉工具回填那一轮的绝大部分输入 —— 12 张照片的 description
 * 约 3K token，在纯 CPU 推理下就是几十秒的等待。
 *
 * theme 保留：服务端据此生成画面概述（getPhotoResultSummary 的 summaryTerms）。
 */
function toPhotoSummary(photo: PhotoItem) {
  return {
    id: photo.id,
    theme: photo.photoAiAnalysis?.theme ?? null,
    tags: photo.photoAiAnalysis?.tags ?? []
  };
}

export const dateSearchTool = tool(
  async ({ startDate, endDate, limit }: DateSearchInput) => {
    const takenAtRange = createTakenAtRange({ startDate, endDate, limit });
    const result = await photoService.listPhotos({
      pageSize: limit,
      takenAtRange,
      withLocation: true,
      withAiAnalysis: true
    });

    return {
      query: { startDate, endDate, timeZone: ARCHIVE_TIME_ZONE },
      total: result.list.length,
      photos: result.list.map(toPhotoSummary)
    };
  },
  {
    name: 'date_search',
    description:
      '查询指定日期范围内拍摄的照片。仅在用户问题包含明确日期、月份、季度或年份时使用；先把自然语言时间解析为 startDate 和 endDate，两个日期都包含在结果中。',
    schema: dateSearchInput
  }
);

export const locationSearchTool = tool(
  async ({ province, city, district, township, keyword, limit }: LocationSearchInput) => {
    const result = await photoService.listPhotos({
      pageSize: limit,
      locationFilter: { province, city, district, township, keyword },
      withLocation: true,
      withAiAnalysis: true
    });

    return {
      query: { province, city, district, township, keyword },
      total: result.list.length,
      photos: result.list.map(toPhotoSummary)
    };
  },
  {
    name: 'location_search',
    description:
      '查询指定省、市、区县、街道、景区或地址片段附近拍摄的照片。用户提到地点、城市、省份、行政区、街道、镇乡、景区、地标或详细地址时必须使用；把已识别的行政区分别填入 province/city/district，街道填 township，其余地点名填 keyword。',
    schema: locationSearchInput
  }
);

export const aiMetadataSearchTool = tool(
  async ({
    tagsAny,
    tagsAll,
    tagsExclude,
    theme,
    descriptionKeyword,
    limit
  }: AiMetadataSearchInput) => {
    const result = await photoService.listPhotos({
      pageSize: limit,
      aiMetadataFilter: {
        tagsAny,
        tagsAll,
        tagsExclude,
        theme,
        descriptionKeyword
      },
      withLocation: true,
      withAiAnalysis: true
    });

    const fallbackQuery = [
      ...(tagsAll ?? []),
      ...(tagsAny ?? []),
      theme,
      descriptionKeyword
    ]
      .filter((term): term is string => Boolean(term))
      .join('，');

    // 排除标签属于硬条件，当前向量查询无法保持该约束，不能兜底放宽。
    if (result.total > 0 || tagsExclude?.length || !fallbackQuery) {
      return {
        query: { tagsAny, tagsAll, tagsExclude, theme, descriptionKeyword },
        total: result.list.length,
        photos: result.list.map(toPhotoSummary)
      };
    }

    console.info('[Agent] 视觉标签无结果，启动向量兜底', {
      query: fallbackQuery,
      primaryTool: 'ai_metadata_search'
    });

    const fallback = await semanticPhotoSearchService.search(
      fallbackQuery,
      limit
    );
    const fallbackPhotoIds = fallback.matches.map((match) => match.photoId);
    const fallbackPhotos = await photoService.getPhotosByIds(fallbackPhotoIds);
    const fallbackPhotoById = new Map(
      fallbackPhotos.map((photo) => [photo.id, photo])
    );
    const similarityByPhotoId = new Map(
      fallback.matches.map((match) => [match.photoId, match.similarity])
    );
    const orderedFallbackPhotos = fallbackPhotoIds
      .map((photoId) => fallbackPhotoById.get(photoId))
      .filter((photo): photo is PhotoItem => Boolean(photo));

    console.info('[Agent] 向量兜底排序', {
      query: fallback.query,
      rankedScores: fallback.matches.map((match) => ({
        photoId: match.photoId,
        descriptionSimilarity: match.descriptionSimilarity,
        tagSimilarity: match.tagSimilarity,
        similarity: match.similarity
      }))
    });

    return {
      query: {
        tagsAny,
        tagsAll,
        tagsExclude,
        theme,
        descriptionKeyword,
        fallback: {
          type: 'semantic',
          text: fallback.query,
          minSimilarity: fallback.minSimilarity
        }
      },
      total: orderedFallbackPhotos.length,
      photos: orderedFallbackPhotos.map((photo) => ({
        ...toPhotoSummary(photo),
        similarity: Number(
          (similarityByPhotoId.get(photo.id) ?? 0).toFixed(3)
        )
      }))
    };
  },
  {
    name: 'ai_metadata_search',
    description:
      '根据 AI 已生成的明确标签、主题或图片描述关键词查询照片。用户提出标准视觉词（如逆光、雪山、夜景、人像、暖色调、对称、建筑）时使用；优先传入具体标准标签 tagsAny。纯视觉条件无结果时工具会自动使用语义向量兜底；若用户用自然语言描述主体关系、动作、空间或复杂氛围，改用 semantic_photo_search。',
    schema: aiMetadataSearchInput
  }
);

export const semanticPhotoSearchTool = tool(
  async ({ query, limit }: SemanticPhotoSearchInput) => {
    const result = await semanticPhotoSearchService.search(query, limit);
    const photoIds = result.matches.map((match) => match.photoId);
    const photos = await photoService.getPhotosByIds(photoIds);
    const photoById = new Map(photos.map((photo) => [photo.id, photo]));
    const similarityByPhotoId = new Map(
      result.matches.map((match) => [match.photoId, match.similarity])
    );
    const orderedPhotos = photoIds
      .map((photoId) => photoById.get(photoId))
      .filter((photo): photo is PhotoItem => Boolean(photo));

    console.info('[Agent] 语义搜索候选', {
      query: result.query,
      matchedTotal: result.total,
      rankedScores: result.matches.map((match) => ({
        photoId: match.photoId,
        descriptionSimilarity: match.descriptionSimilarity,
        tagSimilarity: match.tagSimilarity,
        similarity: match.similarity
      })),
      returnedPhotoIds: orderedPhotos.map((photo) => photo.id)
    });

    return {
      query: {
        text: result.query,
        minSimilarity: result.minSimilarity
      },
      total: orderedPhotos.length,
      photos: orderedPhotos.map((photo) => ({
        ...toPhotoSummary(photo),
        similarity: Number(
          (similarityByPhotoId.get(photo.id) ?? 0).toFixed(3)
        )
      }))
    };
  },
  {
    name: 'semantic_photo_search',
    description:
      '按自然语言的画面语义查找照片。用户描述人物与物件关系、动作、空间层次、复杂氛围、抽象风格或同义表达，且无法可靠落为明确标签时使用。保留用户原意写入 query，不要虚构照片没有出现的地点、时间或拍摄参数。',
    schema: semanticPhotoSearchInput
  }
);

export const exifSearchTool = tool(
  async ({
    camera,
    lens,
    fNumberMin,
    fNumberMax,
    isoMin,
    isoMax,
    focalLengthMin,
    focalLengthMax,
    flashMode,
    limit
  }: ExifSearchInput) => {
    const result = await photoService.listPhotos({
      pageSize: limit,
      exifFilter: {
        camera,
        lens,
        fNumber: { min: fNumberMin, max: fNumberMax },
        iso: { min: isoMin, max: isoMax },
        focalLength: { min: focalLengthMin, max: focalLengthMax },
        flashMode
      },
      withLocation: true,
      withAiAnalysis: true,
      withExif: true
    });

    return {
      query: {
        camera,
        lens,
        fNumberMin,
        fNumberMax,
        isoMin,
        isoMax,
        focalLengthMin,
        focalLengthMax,
        flashMode
      },
      total: result.list.length,
      // 拍摄参数不回给模型：筛选已在数据库完成，prompt 也禁止它复述参数
      photos: result.list.map(toPhotoSummary)
    };
  },
  {
    name: 'exif_search',
    description:
      '根据相机、镜头、焦段、光圈、ISO 或闪光灯状态查询照片。用户提到某个相机/镜头、长焦/广角、大光圈、高 ISO、闪光灯时必须使用；光圈值是 f-number，找“大光圈”应设置 fNumberMax，例如 f/2.8 对应 2.8。',
    schema: exifSearchInput
  }
);
