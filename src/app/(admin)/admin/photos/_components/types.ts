import type { PhotoItem } from '@/lib/types';

/**
 * 后台照片表格的一行。
 *
 * 直接从 PhotoItem 扩展，不再手写字段 —— 后台与前台现在走同一条
 * transformPhoto 路径，拿到的是同一种形状（带签名 URL、不含存储键）。
 * 只多两样表格自己需要的东西。
 */
export type PhotoRow = PhotoItem & {
  /** 源文件是否仍在 MinIO 里，由 listAllWithFileStatus 附加 */
  fileExists: boolean;
  /** UI 状态：该行正在跑 AI 分析 */
  isAnalyzing?: boolean;
};

export type PhotoStats = {
  total: number;
  exists: number;
  missing: number;
  noLocation: number;
  top: number;
};

export type FilterTab = 'all' | 'exists' | 'missing' | 'no-location' | 'top';
