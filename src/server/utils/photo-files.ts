import path from 'path';
import { glob } from 'glob';
import * as Utils from './index';

// 支持的图片 / 视频扩展名
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.heic',
  '.webp'
] as const;
export const VIDEO_EXTENSIONS = ['.mp4', '.mov'] as const;

// glob 匹配模式
export const IMAGE_GLOB = '**.{jpg,jpeg,png,heic,webp}';
export const MEDIA_GLOB = '**.{jpg,jpeg,png,heic,webp,mp4,mov}';

export interface FileGroup {
  name: string; // 不含扩展名的文件名
  ext: string; // 图片扩展名（含点号）
  fileName: string; // 含扩展名的图片文件名
  mimeType: string; // 图片 MIME 类型
  dirAbsolutePath: string; // 所在目录绝对路径
  imageAbsolutePath?: string; // 图片绝对路径
  videoAbsolutePath?: string; // 配对视频绝对路径
}

export function isImageExt(ext: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function isVideoExt(ext: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * 将文件按 "目录 + 文件名" 分组，自动配对同名的图片与视频（Live Photo）
 */
export function groupFiles(files: string[]): Map<string, FileGroup> {
  const groups = new Map<string, FileGroup>();

  for (const file of files) {
    const dir = path.dirname(file);
    const name = path.basename(file, path.extname(file));
    const ext = path.extname(file).toLowerCase();
    const key = path.join(dir, name); // 目录 + 文件名（不含扩展名）作为唯一键

    if (!groups.has(key)) {
      groups.set(key, {
        name,
        ext,
        fileName: '',
        mimeType: '',
        dirAbsolutePath: dir
      });
    }

    const group = groups.get(key)!;
    if (isImageExt(ext)) {
      group.imageAbsolutePath = file;
      group.fileName = path.basename(file);
      group.mimeType = Utils.getMimeType(file);
    } else if (isVideoExt(ext)) {
      group.videoAbsolutePath = file;
    }
  }

  return groups;
}

/**
 * 扫描目录并返回所有包含图片的文件组
 * @param cwd 扫描目录
 * @param includeVideo 是否同时匹配视频文件（用于 Live Photo 配对）
 */
export async function scanImageGroups(
  cwd: string,
  includeVideo = true
): Promise<{ files: string[]; groups: FileGroup[] }> {
  const files = await glob(includeVideo ? MEDIA_GLOB : IMAGE_GLOB, {
    cwd,
    absolute: true,
    nocase: true
  });

  const groups = Array.from(groupFiles(files).values()).filter(
    (g) => g.imageAbsolutePath
  );

  return { files, groups };
}
