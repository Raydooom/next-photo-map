'use server';

import { AIService } from '../services/ai.services';

const aiService = new AIService();

export const analysis = async (
  photo: any
): Promise<{
  success: boolean;
  tags?: string[];
  description?: string;
  chineseDescription?: string;
}> => {
  try {
    const res = await aiService.createAiInfo(photo);
    return res;
  } catch (error) {
    console.error('AI Error:', error);
    throw { success: false, error };
  }
};

export const updateEmbedding = async (photoId: number) => {
  try {
    await aiService.updateEmbedding(photoId);
    return { success: true };
  } catch (error) {
    console.error('AI Error:', error);
    throw { success: false, error };
  }
};
