import { useState, useCallback, useRef, useEffect } from 'react';
import { addToast } from '@heroui/toast';
import type { UploadItem, UploadResultItem } from '../_components/types';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'heic', 'webp'];
const VIDEO_EXTS = ['mp4', 'mov'];

const getExt = (name: string) => name.split('.').pop()?.toLowerCase() || '';
const getBaseName = (name: string) => name.replace(/\.[^/.]+$/, '');

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function useUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // 清理预览 URL，避免内存泄漏
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 标记 Live Photo（图片存在同名视频）
  const markLivePhotos = useCallback((list: UploadItem[]): UploadItem[] => {
    const videoBaseNames = new Set(
      list.filter((i) => i.kind === 'video').map((i) => getBaseName(i.name))
    );
    return list.map((item) =>
      item.kind === 'image'
        ? { ...item, isLivePhoto: videoBaseNames.has(getBaseName(item.name)) }
        : item
    );
  }, []);

  // 添加文件
  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const newItems: UploadItem[] = [];

      for (const file of incoming) {
        const ext = getExt(file.name);
        const isImage = IMAGE_EXTS.includes(ext);
        const isVideo = VIDEO_EXTS.includes(ext);
        if (!isImage && !isVideo) continue;

        newItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          file,
          name: file.name,
          size: file.size,
          kind: isImage ? 'image' : 'video',
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          status: 'pending',
          progress: 0
        });
      }

      if (newItems.length === 0) {
        addToast({
          title: '未添加文件',
          description: '请选择 jpg/png/heic/webp 图片或 mp4/mov 视频',
          color: 'warning'
        });
        return;
      }

      setItems((prev) => {
        // 按文件名去重（保留已有项）
        const existingNames = new Set(prev.map((i) => i.name));
        const filtered = newItems.filter((i) => !existingNames.has(i.name));
        return markLivePhotos([...prev, ...filtered]);
      });
    },
    [markLivePhotos]
  );

  // 移除单个文件
  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
        return markLivePhotos(prev.filter((i) => i.id !== id));
      });
    },
    [markLivePhotos]
  );

  // 清空列表
  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  // 更新指定状态的所有项
  const patchByStatus = (
    statuses: UploadItem['status'][],
    patch: Partial<UploadItem>
  ) => {
    setItems((prev) =>
      prev.map((i) => (statuses.includes(i.status) ? { ...i, ...patch } : i))
    );
  };

  // 开始上传
  const startUpload = useCallback(() => {
    const pending = items.filter(
      (i) => i.status === 'pending' || i.status === 'error'
    );
    if (pending.length === 0 || isUploading) return;

    setIsUploading(true);

    const formData = new FormData();
    pending.forEach((item) => formData.append('file', item.file));

    // 标记上传中
    patchByStatus(['pending', 'error'], {
      status: 'uploading',
      progress: 0,
      error: undefined
    });

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/admin/upload');

    // 上传进度
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      // 上传阶段最多到 90%，剩余留给服务端处理
      const progress = Math.min(90, percent);
      setItems((prev) =>
        prev.map((i) => (i.status === 'uploading' ? { ...i, progress } : i))
      );
    };

    xhr.onload = () => {
      setIsUploading(false);
      xhrRef.current = null;

      let res: {
        success?: boolean;
        message?: string;
        data?: { results?: UploadResultItem[] };
        error?: string;
      } = {};
      try {
        res = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        patchByStatus(['uploading'], {
          status: 'error',
          progress: 0,
          error: res.error || `上传失败 (${xhr.status})`
        });
        addToast({
          title: '上传失败',
          description: res.error,
          color: 'danger'
        });
        return;
      }

      // 根据服务端返回结果更新每个文件状态
      const resultMap = new Map(
        (res.data?.results || []).map((r) => [r.filename, r])
      );

      setItems((prev) =>
        prev.map((item) => {
          if (item.status !== 'uploading') return item;
          const result = resultMap.get(item.name);

          // 视频文件不会单独出现在结果中（随图片入库），视为成功
          if (!result) {
            return { ...item, status: 'success', progress: 100 };
          }
          return result.success
            ? { ...item, status: 'success', progress: 100, error: undefined }
            : {
                ...item,
                status: 'error',
                progress: 0,
                error: result.error || '入库失败'
              };
        })
      );

      const successCount =
        res.data?.results?.filter((r) => r.success).length ?? 0;
      const failCount = (res.data?.results?.length ?? 0) - successCount;
      addToast({
        title: '上传完成',
        description: `成功 ${successCount} 张${failCount > 0 ? `，失败 ${failCount} 张` : ''}`,
        color: failCount > 0 ? 'warning' : 'success'
      });
    };

    xhr.onerror = () => {
      setIsUploading(false);
      xhrRef.current = null;
      patchByStatus(['uploading'], {
        status: 'error',
        progress: 0,
        error: '网络错误'
      });
      addToast({ title: '上传失败', description: '网络错误', color: 'danger' });
    };

    xhr.send(formData);
  }, [items, isUploading]);

  // 取消上传
  const cancelUpload = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setIsUploading(false);
    patchByStatus(['uploading'], { status: 'pending', progress: 0 });
  }, []);

  // 统计信息
  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    success: items.filter((i) => i.status === 'success').length,
    error: items.filter((i) => i.status === 'error').length,
    totalSize: items.reduce((sum, i) => sum + i.size, 0)
  };

  return {
    items,
    isUploading,
    stats,
    addFiles,
    removeItem,
    clearAll,
    startUpload,
    cancelUpload,
    formatSize
  };
}
