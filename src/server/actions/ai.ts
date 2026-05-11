'use server';

import { AIService } from '../services/ai.services';
import { getImageBase64 } from '../lib/oss';

const aiService = new AIService();

export const analysis = async (
  photo: any
): Promise<{ success: boolean; tags?: string[] }> => {
  const base64Image = await getImageBase64(photo.thumbSmallKey!);
  try {
    const tags = await aiService.generateTags(base64Image);
    return { success: true, tags };
  } catch (error) {
    console.error('AI Error:', error);
    throw { success: false, error };
  }
};
