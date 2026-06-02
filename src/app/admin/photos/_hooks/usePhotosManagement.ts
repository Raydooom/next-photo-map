import { useState, useEffect, useMemo, useCallback } from 'react';
import * as Admin from '@/server/actions/admin';
import * as AI from '@/server/actions/ai';
import { Photo, PhotoStats, FilterTab } from '../_components/types';

export function usePhotosManagement() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // 加载照片列表
  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Admin.getPhotosWithFileStatus();
      const formatted: Photo[] = data.map((p) => ({
        id: p.id,
        filename: p.filename,
        tags: p.photoAiAnalysis?.tags || [],
        originalPath: p.originalPath,
        originalKey: p.originalKey,
        thumbLargeKey: p.thumbLargeKey,
        thumbSmallKey: p.thumbSmallKey,
        takenAt: p.takenAt?.toISOString() || null,
        fileExists: p.fileExists,
        createdAt: p.createdAt.toISOString(),
        hasLocation: Boolean(p.location) || false,
        top: p.top || false
      }));
      setPhotos(formatted);
    } catch (error) {
      console.error('加载图片失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // 统计数据
  const stats: PhotoStats = useMemo(
    () => ({
      total: photos.length,
      exists: photos.filter((p) => p.fileExists).length,
      missing: photos.filter((p) => !p.fileExists).length,
      noLocation: photos.filter((p) => !p.hasLocation).length,
      top: photos.filter((p) => p.top).length
    }),
    [photos]
  );

  // 过滤后的照片
  const filteredPhotos = useMemo(() => {
    switch (activeTab) {
      case 'exists':
        return photos.filter((p) => p.fileExists);
      case 'missing':
        return photos.filter((p) => !p.fileExists);
      case 'no-location':
        return photos.filter((p) => !p.hasLocation);
      case 'top':
        return photos.filter((p) => p.top);
      default:
        return photos;
    }
  }, [photos, activeTab]);

  // ============ 操作方法 ============

  const deletePhoto = useCallback(async (id: number) => {
    try {
      await Admin.deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('删除失败:', error);
    }
  }, []);

  const deleteMissingPhotos = useCallback(async () => {
    try {
      await Admin.deleteMissingPhotos();
      await loadPhotos();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  }, [loadPhotos]);

  const updateLocation = useCallback(
    async (id: number, latitude: number, longitude: number) => {
      try {
        await Admin.updatePhotoLocation(id, latitude, longitude);
        setPhotos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, hasLocation: true } : p))
        );
      } catch (error) {
        console.error('更新位置失败:', error);
        throw error;
      }
    },
    []
  );

  const deleteLocation = useCallback(async (id: number) => {
    try {
      await Admin.deletePhotoLocation(id);
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, hasLocation: false } : p))
      );
    } catch (error) {
      console.error('删除位置失败:', error);
    }
  }, []);

  const toggleTop = useCallback(async (photo: Photo) => {
    try {
      await Admin.updatePhotoTop(photo.id, !photo.top);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, top: !p.top } : p))
      );
    } catch (error) {
      console.error('更新置顶状态失败:', error);
    }
  }, []);

  const analyzePhoto = useCallback(async (photo: Photo) => {
    try {
      const { tags } = await AI.analysis(photo);
      if (tags?.length) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, tags } : p))
        );
      }
    } catch (error) {
      console.error('AI 分析失败:', error);
    }
  }, []);

  return {
    // 数据
    photos,
    filteredPhotos,
    stats,
    loading,
    activeTab,
    // 操作
    setActiveTab,
    loadPhotos,
    deletePhoto,
    deleteMissingPhotos,
    updateLocation,
    deleteLocation,
    toggleTop,
    analyzePhoto
  };
}
