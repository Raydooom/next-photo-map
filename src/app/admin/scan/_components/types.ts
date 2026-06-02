/**
 * 扫描进度事件类型
 */
export interface ScanProgress {
  type: 'start' | 'progress' | 'complete' | 'error' | 'end';
  message: string;
  data?: any;
}
