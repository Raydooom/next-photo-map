'use server';
import { Prisma } from '../lib/db';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';

const photoService = new PhotoService();

export const getPhotoList = async () => {
  return await photoService.listPhotos();
};

export const getPhotoExif = async (photoId: number) => {
  return await photoExifService.getPhotoExifByPhotoId(photoId);
};
