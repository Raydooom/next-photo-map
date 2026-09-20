'use server';

import 'server-only';

/**
 * 公开数据的读取入口，只供客户端组件调用 —— 它们跑在浏览器里，没有别的
 * 途径访问数据库。Server Component 与 service 同进程，应直接调 service：
 * 每个 'use server' 导出都会变成一个可公开 POST 的端点，白经过这里只是
 * 多暴露一个端点、多一层序列化。
 *
 * 全是公开数据，无需鉴权。管理端写操作在 (admin)/admin/_actions.ts。
 */

import { photoService } from '@/server/services/photo/photo.service';


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
