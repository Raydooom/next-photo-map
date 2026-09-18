import { NextResponse } from 'next/server';
import { PHOTO_BASE_DIR } from '@/server/infra/env';
import { PhotoService } from '@/server/services/photo/photo.service';
import { scanImageGroups } from '@/server/services/ingestion/photo-files';
import { requireAdminResponse } from '@/server/auth';

export const dynamic = 'force-dynamic';

/**
 * 发现扫描信息 API
 * 返回总照片数、新照片数、已存在照片数
 */
export async function GET() {
  const denied = await requireAdminResponse();
  if (denied) return denied;

  try {
    const photoService = new PhotoService();

    // 扫描文件系统（仅图片，无需配对视频）
    const { files, groups } = await scanImageGroups(PHOTO_BASE_DIR, false);

    // 批量检查已存在的照片，避免 N+1 查询
    const imagePaths = groups.map((g) => g.imageAbsolutePath!).filter(Boolean);
    const existingPaths = await photoService.findExistingPaths(imagePaths);

    const totalPhotos = groups.length;
    const existingCount = existingPaths.size;

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      totalGroups: totalPhotos,
      existingCount,
      newCount: totalPhotos - existingCount
    });
  } catch (error) {
    console.error('发现照片失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '发现照片失败' },
      { status: 500 }
    );
  }
}
