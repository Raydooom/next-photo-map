'use client';
import { RowInfo } from '@/components/modules/RowInfo';
import { ExifData, PhotoDetail } from '@/types';
import * as Action from '@/services/actions';
import { useEffect, useState } from 'react';
import { Card } from '@heroui/card';
import { LocationIcon, DateIcon } from '@/components/Icons/icon';
import { formatLatLng } from '@/utils/format';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { LeftIcon } from '@/components/Icons/button';

export const PointDetail = ({ viewList }: { viewList: ExifData[] }) => {
  const [photoList, setPhotoList] = useState<PhotoDetail[]>([]);

  useEffect(() => {
    const photoIds = viewList.map(item => item.photoId);
    Action.getPhotoDetailBatch(photoIds).then(data => {
      setPhotoList(data);
    });
  }, [viewList]);

  return (
    <Card className="absolute top-20 left-4 z-10">
      {photoList.length === 1 ? (
        <div className="w-[300px]">
          <div className="px-4">
            <div className="pt-3 -mb-3 flex items-center justify-between gap-2">
              <span className="text-tiny font-bold">
                {photoList[0].exifData?.EXIFDatetimeoriginal}
              </span>
              <LeftIcon
                variant="light"
                className="h-10 w-10 flex-shrink-0 shadow-none"
              />
            </div>
            <small className="block text-default-500">
              {photoList[0].exifData?.ImageModel}
            </small>
            <h3 className="pb-3 truncate font-bold text-large">
              {photoList[0].name}
            </h3>
          </div>
          <Image
            src={photoList[0].url}
            alt={photoList[0].name || ''}
            width={300}
            height={180}
          />

          <dl className="p-4 flex flex-col gap-1 items-flex-start">
            <RowInfo
              icon={<LocationIcon className="flex-shrink-0" size={14} />}
              value={formatLatLng(photoList[0]?.exifData)}
            />
            <RowInfo
              icon={<DateIcon className="flex-shrink-0" size={14} />}
              value={photoList[0].exifData?.EXIFDatetimeoriginal}
            />
          </dl>
        </div>
      ) : (
        <div>123</div>
      )}
    </Card>
  );
};
