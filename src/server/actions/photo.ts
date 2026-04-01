'use server';
import { Prisma } from '../lib/db';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';

const photoService = new PhotoService();

export const getCountPhotos = async (where: Prisma.photosWhereInput) => {
  return await photoService.listPhotos();
};

export const getPhotoExif = async () => {
  return await photoExifService.getAllPhotoExifs();
};
