/**
 * 上传项状态
 */
export type UploadItemStatus =
  | 'pending' // 等待上传
  | 'uploading' // 上传中
  | 'success' // 上传成功
  | 'error'; // 上传失败

/**
 * 待上传文件项
 */
export interface UploadItem {
  id: string; // 唯一标识
  file: File; // 原始文件
  name: string; // 文件名
  size: number; // 文件大小（字节）
  kind: 'image' | 'video'; // 文件类型
  previewUrl?: string; // 图片预览地址
  status: UploadItemStatus; // 当前状态
  progress: number; // 上传进度 0-100
  error?: string; // 错误信息
  isLivePhoto?: boolean; // 是否为 Live Photo（图片 + 同名视频）
}

/**
 * 上传接口返回的单项结果
 */
export interface UploadResultItem {
  filename: string;
  success: boolean;
  photoId?: number;
  isLivePhoto?: boolean;
  aiAnalyzed?: boolean;
  error?: string;
}
