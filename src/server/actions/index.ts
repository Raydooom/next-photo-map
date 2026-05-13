'use server';
import { PhotoService } from '../services/photo.services';
import { locationService } from '../services/location.services';

const photoService = new PhotoService();

export const getPhotoList = async ({
  page = 1,
  pageSize = 20,
  withLocation = false,
  withExif = false,
  withAiAnalysis = false,
  top = false
} = {}) => {
  return await photoService.listPhotos({
    page,
    pageSize,
    withLocation,
    withExif,
    withAiAnalysis,
    top
  });
};

export const countAllPhotos = async () => {
  return await photoService.countAllPhotos();
};

export const getPhotoDetail = async (photoId: number) => {
  return await photoService.getPhotoById(photoId);
};

export const getPhotoDetailBatch = async (photoIds: number[]) => {
  return await photoService.getPhotosByIds(photoIds);
};

export const getLocations = async ({ select = {} } = {}) => {
  return await locationService.getAllLocations({ select });
};
