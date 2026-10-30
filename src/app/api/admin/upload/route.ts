import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PHOTO_BASE_DIR } from '@/server/infra/env';
import { ScannerService } from '@/server/services/ingestion/scanner.service';
import { groupFiles, isImageExt, isVideoExt } from '@/server/services/ingestion/photo-files';
import { isAdmin, isUploadAuthorized } from '@/server/auth';

export const dynamic = 'force-dynamic';

// 单文件大小上限（字节）。原始照片/实况视频较大，给到 200MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;

/**
 * 上传图片 API
 * 支持手动上传 Live Photo（同名图片和视频）
 * 上传完成后自动扫描入库并进行 AI 分析
 *
 * 鉴权双通道，任一通过即可：
 *   - 后台网页：浏览器自带的管理端登录 cookie（isAdmin）
 *   - 手机 App：请求头 Authorization: Bearer <UPLOAD_TOKEN>（isUploadAuthorized）
 */
export async function POST(request: NextRequest) {
  const authorized = isUploadAuthorized(request) || (await isAdmin());
  if (!authorized) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    // 确保目录存在
    if (!existsSync(PHOTO_BASE_DIR)) {
      await mkdir(PHOTO_BASE_DIR, { recursive: true });
    }

    // 保存所有媒体文件到 photos 目录
    const savedPaths: string[] = [];
    for (const file of files) {
      // File.name 正常只是文件名，出现路径成分即为构造过的请求。
      // 直接拒绝而不静默改名，免得掩盖痕迹
      if (
        file.name !== path.basename(file.name) ||
        file.name.includes('..') ||
        file.name.includes('/') ||
        file.name.includes('\\')
      ) {
        return NextResponse.json(
          { error: `非法文件名: ${file.name}` },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!isImageExt(ext) && !isVideoExt(ext)) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件过大: ${file.name}（上限 ${MAX_FILE_SIZE / 1024 / 1024}MB）` },
          { status: 413 }
        );
      }

      const buffer = await file.arrayBuffer();
      const filePath = path.join(PHOTO_BASE_DIR, file.name);
      await writeFile(filePath, new Uint8Array(buffer));
      savedPaths.push(filePath);
    }

    // 按文件名分组，自动配对 Live Photo（同名图片 + 视频）
    const groups = Array.from(groupFiles(savedPaths).values()).filter(
      (g) => g.imageAbsolutePath
    );

    if (groups.length === 0) {
      return NextResponse.json({ error: '没有找到图片文件' }, { status: 400 });
    }

    const scannerService = new ScannerService();
    const results = [];

    // 逐个处理图片入库（包含 AI 分析）
    for (const group of groups) {
      const result = await scannerService.processPhoto({
        imagePath: group.imageAbsolutePath!,
        videoPath: group.videoAbsolutePath || null,
        force: false,
        enableAI: true
      });

      results.push({
        filename: group.fileName,
        success: result.success,
        photoId: result.photoId,
        isLivePhoto: !!group.videoAbsolutePath,
        aiAnalyzed: result.aiAnalyzed,
        error: result.error
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: successCount > 0,
      message: `上传完成：成功 ${successCount} 张，失败 ${failCount} 张`,
      data: {
        total: results.length,
        success: successCount,
        failed: failCount,
        results
      }
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败' },
      { status: 500 }
    );
  }
}
