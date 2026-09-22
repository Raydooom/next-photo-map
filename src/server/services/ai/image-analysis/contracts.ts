import { z } from 'zod';

const tagSchema = z.string().trim().min(1).max(32);

export const imageAnalysisResultSchema = z.object({
  description: z.string().trim().min(1).max(2400),
  theme: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  tags: z
    .union([z.array(tagSchema), z.string()])
    .transform((value) => {
      const source = Array.isArray(value) ? value : value.split(/[,，]/);
      return [...new Set(source.map((tag) => tag.trim()).filter(Boolean))].slice(
        0,
        12
      );
    })
    .refine((tags) => tags.length > 0, '至少需要一个标签')
});

export type ImageAnalysisResult = z.infer<typeof imageAnalysisResultSchema>;

export type ImageAnalysisErrorCode =
  | 'PHOTO_NOT_FOUND'
  | 'VISION_FAILED'
  | 'INVALID_MODEL_OUTPUT'
  | 'EMBEDDING_FAILED'
  | 'VECTOR_DIMENSION_MISMATCH';

export class ImageAnalysisError extends Error {
  constructor(
    public readonly code: ImageAnalysisErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ImageAnalysisError';
  }
}

/** 从可能带 markdown fence 或额外说明的模型文本中提取 JSON 对象。 */
export function parseImageAnalysisResult(raw: string): ImageAnalysisResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = (fenced ?? raw).trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new ImageAnalysisError(
      'INVALID_MODEL_OUTPUT',
      '视觉模型没有返回可解析的 JSON 对象'
    );
  }

  try {
    return imageAnalysisResultSchema.parse(JSON.parse(source.slice(start, end + 1)));
  } catch (error) {
    throw new ImageAnalysisError(
      'INVALID_MODEL_OUTPUT',
      '视觉模型返回的图片分析结构不合法',
      error
    );
  }
}
