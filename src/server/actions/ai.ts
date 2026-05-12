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
