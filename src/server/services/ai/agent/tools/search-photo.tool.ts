import 'server-only';

import { tool } from '@langchain/core/tools';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';
import { photoService } from '@/server/services/photo/photo.service';
import type { PhotoItem } from '@/lib/types/photo';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const ARCHIVE_TIME_ZONE = 'Asia/Shanghai';
const CALENDAR_DATE_FORMAT = 'YYYY-MM-DD';

const dateSearchInput = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '开始日期必须为 YYYY-MM-DD')
    .describe('包含的起始拍摄日期，格式为 YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '结束日期必须为 YYYY-MM-DD')
    .describe('包含的结束拍摄日期，格式为 YYYY-MM-DD；可与 startDate 相同'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(12)
    .describe('最多返回的代表照片数量，默认 12，最大 20')
});

type DateSearchInput = z.infer<typeof dateSearchInput>;

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

function formatTakenAt(takenAt: Date | null) {
  return takenAt
    ? dayjs(takenAt).tz(ARCHIVE_TIME_ZONE).format('YYYY-MM-DD HH:mm')
    : null;
}

/** 工具结果只保留模型回答与后续照片引用所需的字段，不传存储键、URL 或原始 EXIF。 */
function toPhotoSummary(photo: PhotoItem) {
  const location = photo.location;
  const region = [location?.province, location?.city, location?.district]
    .filter((part): part is string => Boolean(part))
    .join('');

  return {
    id: photo.id,
    filename: photo.filename,
    takenAt: formatTakenAt(photo.takenAt),
    location: location?.formattedAddress ?? (region || null),
    description: photo.photoAiAnalysis?.description?.slice(0, 200) ?? null,
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
      query: {
        startDate,
        endDate,
        timeZone: ARCHIVE_TIME_ZONE
      },
      total: result.total,
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
