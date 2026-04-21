'use server';
import { Prisma } from '../lib/db';
import { PhotoService } from '../services/photo.services';
import { photoExifService } from '../services/photoExif.services';
import { locationService } from '../services/location.services';

const photoService = new PhotoService();

export const getPhotoList = async ({
  page = 1,
  pageSize = 20,
  withLocation = false,
  withExif = false
} = {}) => {
  return await photoService.listPhotos({
    page,
    pageSize,
    withLocation,
    withExif
  });
};

export const countAllPhotos = async () => {
  return await photoService.countAllPhotos();
};

export const getPhotoExif = async (photoId: number) => {
  return await photoExifService.getPhotoExifByPhotoId(photoId);
};

export const getPhotoDetailBatch = async (photoIds: number[]) => {
  return await photoService.getPhotosByIds(photoIds);
};

export const getLocations = async ({ select = {} } = {}) => {
  return await locationService.getAllLocations({ select });
};
