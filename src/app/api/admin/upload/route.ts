import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { PHOTO_BASE_DIR } from '@/server/config';
import { ScannerService } from '@/server/services/admin.services';

export const dynamic = 'force-dynamic';

/**
 * 上传图片 API
 * 直接保存原始文件到 photos 目录
 * 上传完成后自动扫描
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const videoFile = formData.get('video') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: '缺少图片文件' }, { status: 400 });
    }

    // 验证文件类型
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/webp'
    ];

    if (
      !allowedImageTypes.includes(imageFile.type) &&
      !imageFile.name.toLowerCase().endsWith('.heic')
    ) {
      return NextResponse.json({ error: '不支持的图片格式' }, { status: 400 });
    }

    // 直接保存到 PHOTO_BASE_DIR（photos 目录）
    const uploadDir = PHOTO_BASE_DIR;

    // 确保目录存在
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存原始图片文件（不转换格式）
    const imageBuffer = await imageFile.arrayBuffer();
    const imagePath = path.join(uploadDir, imageFile.name);
    await writeFile(imagePath, new Uint8Array(imageBuffer));

    // 如果有视频文件（Live Photo），也保存
    let videoPath: string | null = null;
    if (videoFile) {
      const videoBuffer = await videoFile.arrayBuffer();
      videoPath = path.join(uploadDir, videoFile.name);
      await writeFile(videoPath, new Uint8Array(videoBuffer));
    }

    // 上传完成后自动扫描这张图片
    let scanSuccess = false;
    try {
      const scannerService = new ScannerService();
      await scannerService.startScanner(false); // 增量扫描，只处理新文件
      scanSuccess = true;
    } catch (scanError) {
      console.error('自动扫描失败:', scanError);
      // 扫描失败不影响上传成功
    }

    return NextResponse.json({
      success: true,
      message: scanSuccess
        ? '上传成功并已自动扫描'
        : '上传成功（扫描失败，请手动扫描）',
      data: {
        imagePath: imageFile.name,
        videoPath: videoFile ? videoFile.name : null,
        isLivePhoto: !!videoFile,
        scanSuccess
      }
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '上传失败'
      },
      { status: 500 }
    );
  }
}
