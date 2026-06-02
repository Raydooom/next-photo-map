import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/server/services/ai.services';
import { PhotoService } from '@/server/services/photo.services';
import { createSSE } from '@/utils/request';

const aiService = new AIService();
const photoService = new PhotoService();

export async function GET(request: NextRequest) {
  try {
    const { response, controller } = createSSE();

    // 监听客户端断开/中止
    const signal = request.signal;

    (async () => {
      try {
        const allPhotos = await photoService.getAllPhotos();

        let count = 0;
        for (const photo of allPhotos) {
          // 客户端已中止，停止后续分析
          if (signal.aborted) {
            console.log('客户端已停止分析，中断处理');
            break;
          }

          await aiService.createAiInfo(photo);
          count++;

          // 中止后不再发送消息（连接可能已关闭）
          if (signal.aborted) break;

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
        }
      } catch (err) {
        console.error('批量分析过程出错:', err);
        if (!signal.aborted) {
          controller.sendMessage({
            status: 'error',
            message: '分析过程中发生错误',
            type: 'text'
          });
        }
      } finally {
        controller.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('AI 分析照片 API 错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
