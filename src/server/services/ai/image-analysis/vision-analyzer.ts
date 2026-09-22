import 'server-only';

import { HumanMessage } from '@langchain/core/messages';
import { getVisionChatModel } from '@/server/infra/chat-model';
import { getImageBase64 } from '@/server/infra/storage';
import {
  ImageAnalysisError,
  ImageAnalysisResult,
  parseImageAnalysisResult
} from './contracts';
import { IMAGE_ANALYSIS_PROMPT } from './prompt';

function getTextContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) =>
      part && typeof part === 'object' && 'text' in part
        ? String((part as { text?: unknown }).text ?? '')
        : ''
    )
    .join('');
}

class VisionAnalyzer {
  async analyze(imageKey: string): Promise<ImageAnalysisResult> {
    try {
      // Scanner 生成的大缩略图统一为 JPEG，不能再按原文件扩展名猜 MIME。
      const imageDataUrl = await getImageBase64(imageKey, 'image/jpeg');
      const response = await getVisionChatModel().invoke([
        new HumanMessage({
          content: [
            { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        })
      ]);
      const text = getTextContent(response.content);

      return parseImageAnalysisResult(text);
    } catch (error) {
      if (error instanceof ImageAnalysisError) throw error;
      throw new ImageAnalysisError(
        'VISION_FAILED',
        '视觉模型分析图片失败',
        error
      );
    }
  }
}

export const visionAnalyzer = new VisionAnalyzer();
