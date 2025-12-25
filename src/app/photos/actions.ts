'use server';
import PhotoService from '@/services/photo';

export const getPhotoDetail = async (id: number) => {
  return await PhotoService.getPhotoDetail(id);
};
