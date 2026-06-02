import { NextResponse } from 'next/server';
import { glob } from 'glob';
import path from 'path';
import { PHOTO_BASE_DIR } from '@/server/config';
import { PhotoService } from '@/server/services/photo.services';

export const dynamic = 'force-dynamic';

/**
 * 发现扫描信息 API
 * 返回总照片数、新照片数、已存在照片数
 */
export async function GET() {
  try {
    const photoService = new PhotoService();

    // 扫描文件系统
    const files = await glob('**.{jpg,jpeg,png,heic,webp}', {
      cwd: PHOTO_BASE_DIR,
      absolute: true,
      nocase: true
    });

    // 按文件名分组
    const groups = groupFiles(files);
    const totalPhotos = Array.from(groups.values()).filter(
      (g) => g.imageAbsolutePath
    ).length;

    // 检查每张照片是否已存在
    let existingCount = 0;
    for (const group of groups.values()) {
      if (group.imageAbsolutePath) {
        const existing = await photoService.checkPhotoExists(
          group.imageAbsolutePath
        );
        if (existing) {
          existingCount++;
        }
      }
    }

    const newCount = totalPhotos - existingCount;

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      totalGroups: totalPhotos,
      existingCount: existingCount,
      newCount: newCount
    });
  } catch (error) {
    console.error('发现照片失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发现照片失败' },
      { status: 500 }
    );
  }
}

/**
 * 将文件按文件名分组（图片文件）
 */
function groupFiles(files: string[]): Map<
  string,
  {
    name: string;
    ext: string;
    dirAbsolutePath: string;
    imageAbsolutePath?: string;
  }
> {
  const groups = new Map();

  for (const file of files) {
    const dir = path.dirname(file);
    const name = path.basename(file, path.extname(file));
    const ext = path.extname(file).toLowerCase();
    const key = path.join(dir, name); // 使用 目录+文件名 作为唯一键

    if (!groups.has(key)) {
      groups.set(key, {
        name,
        ext,
        dirAbsolutePath: dir
      });
    }

    const group = groups.get(key)!;
    if (['.jpg', '.jpeg', '.png', '.heic', '.webp'].includes(ext)) {
      group.imageAbsolutePath = file;
    }
  }

  return groups;
}
