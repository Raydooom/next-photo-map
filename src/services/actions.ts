'use server';

import PhotoService from './photo';

export const getPhotoExtendInfo = async (id: number) => {
  return await PhotoService.getPhotoExtendInfo(id);
};
