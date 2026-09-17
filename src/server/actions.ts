'use server';

import 'server-only';

/**
 * 公开数据的读取入口，供**客户端组件**调用。
 *
 * 为什么只放这些：`'use server'` 导出的每个函数都会被编译成一个可公开
 * POST 调用的端点。Server Component 与 service 同进程，直接调 service 即可，
 * 经过这里只是多暴露一个端点、多一层序列化。所以这里只保留客户端组件
 * 确实需要的查询 —— 它们运行在浏览器里，没有别的途径访问数据库。
 *
 * 调用方：
 * - app/photos/_components/InfinitePhotoGrid.tsx  滚动加载下一页
 * - components/photo/ExifInfo.tsx                 点开照片后拉取 EXIF
 * - app/footprint/_components/Map.tsx             点击地图点位取照片
 *
 * 这里全部是公开数据，不需要鉴权。管理端的写操作在
 * app/admin/photos/_actions.ts，那边每个都必须校验身份。
 */

import { PhotoService } from '@/server/photo/photo.service';

const photoService = new PhotoService();

export const getPhotoList = async ({
  page = 1,
  pageSize = 20,
  withLocation = false,
  withExif = false,
  withAiAnalysis = false,
  top = false
} = {}) => {
  return await photoService.listPhotos({
    page,
    pageSize,
    withLocation,
    withExif,
    withAiAnalysis,
    top
  });
};

export const getPhotoDetail = async (photoId: number) => {
  return await photoService.getPhotoById(photoId);
};

export const getPhotoDetailBatch = async (photoIds: number[]) => {
  return await photoService.getPhotosByIds(photoIds);
};
