'use server';

import PhotoService from './photo';

export const getPhotoExtendInfo = async (id: number) => {
  return await PhotoService.getPhotoExtendInfo(id);
};

export const getPhotoDetail = async (id: number) => {
  return await PhotoService.getPhotoDetail(id);
};

export const getPhotoDetailBatch = async (ids: number[]) => {
  return await PhotoService.getPhotoDetailBatch(ids);
};
