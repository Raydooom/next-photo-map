import { NextResponse } from 'next/server';
import { AIService } from '@/server/services/ai.services';
import { PhotoService } from '@/server/services/photo.services';
import { createSSE } from '@/utils/request';

const aiService = new AIService();
const photoService = new PhotoService();

export async function GET() {
  try {
    const { response, controller } = createSSE();
    (async () => {
      const allPhotos = await photoService.getAllPhotos();

      let count = 0;
      for (const photo of allPhotos) {
        await aiService.createAiInfo(photo);
        count++;
        // 模拟分析进度
        controller.sendMessage({
          current: count,
          total: allPhotos.length,
          status: count === allPhotos.length ? 'done' : 'loading',
          message:
            count === allPhotos.length
              ? '已完成'
              : `正在分析照片 ${count}/${allPhotos.length}`,
          type: 'text'
        });
        if (count === allPhotos.length) {
          controller.close();
        }
      }
    })();

    return response;
  } catch (error) {
    console.error('AI 分析照片 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
