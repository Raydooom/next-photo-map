'use client';
import { PhotoLocation, PhotoDetail } from '@/types';
import * as Action from '@/services/actions';
import { useEffect, useState } from 'react';
import { Card } from '@heroui/card';
import { formatTakenDate } from '@/utils/format';
import Image from 'next/image';
import {
  CloseIcon,
  MoveLocationIcon,
  OpenInNewWindowIcon
} from '@/components/Icons/button';
import { ExifTagList } from '@/components/modules/ExifTag';
import { Skeleton } from '@heroui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkerListDataItem } from '@/types/mapMarker';

const JumpPhoto = (photoId: number) => {
  window.open(`/photos?photoId=${photoId}`, '_blank');
};

export const PointDetail = ({
  viewList,
  onClose,
  onBackLocation
}: {
  viewList: MarkerListDataItem[];
  onClose: () => void;
  onBackLocation: (location: MarkerListDataItem) => void;
}) => {
  const [photoList, setPhotoList] = useState<PhotoDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (viewList.length === 0) return;
    setIsLoading(true);
    const photoIds = viewList.map(item => item.id);
    Action.getPhotoDetailBatch(photoIds).then(data => {
      setPhotoList(data);
      setIsLoading(false);
    });
    setIsOpen(true);
  }, [viewList]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const onClickLocation = () => {
    if (viewList[0]) {
      onBackLocation(viewList[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="absolute top-20 left-4 z-10 w-[310px] "
          initial={{ opacity: 0, x: -20, scale: 0.95, filter: 'blur(10px)' }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            filter: 'blur(0px)',
            transition: {
              type: 'spring',
              stiffness: 260, // 刚度高，速度快
              damping: 20, // 阻尼适中，防止过度晃动
              mass: 0.5 // 质量轻，起步更快
            }
          }}
          exit={{
            opacity: 0,
            x: -10,
            scale: 0.98,
            filter: 'blur(5px)',
            transition: {
              duration: 0.15,
              ease: 'easeOut'
            }
          }}
        >
          <Card className="rounded-3xl bg-background/90 backdrop-blur-md">
            <CloseIcon
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-6 h-6 text-sm min-w-6"
            />
            {viewList.length === 1 ? (
              <>
                {isLoading ? (
                  <SingleImageSkeleton />
                ) : (
                  <SingleImage
                    onClickLocation={onClickLocation}
                    photoInfo={photoList[0]}
                  />
                )}
              </>
            ) : (
              <>
                {isLoading ? (
                  <MultiImageSkeleton />
                ) : (
                  <MultiImage
                    onClickLocation={onClickLocation}
                    photoList={photoList}
                  />
                )}
              </>
            )}
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

// 单图展示
const SingleImageSkeleton = () => (
  <>
    <Skeleton className="h-50 bg-default-300"></Skeleton>
    <div className="p-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(item => (
          <Skeleton
            key={item}
            className="rounded-lg h-6 bg-default-400"
          ></Skeleton>
        ))}
      </div>
      <Skeleton className="w-1/3 h-4 rounded-lg bg-default-300"></Skeleton>
      <Skeleton className="h-3 rounded-lg bg-default-200"></Skeleton>
      <Skeleton className="h-4 w-2/3 rounded-lg bg-default-300"></Skeleton>
      <Skeleton className="mt-2 h-5 w-2/3 rounded-lg bg-default-300"></Skeleton>
    </div>
  </>
);
const SingleImage = ({
  photoInfo,
  onClickLocation
}: {
  photoInfo: PhotoDetail;
  onClickLocation: () => void;
}) => (
  <>
    <motion.div
      initial={{ opacity: 0, z: 10 }}
      animate={{ opacity: 1, z: 10 }}
      transition={{ delay: 0.1 }}
    >
      <div className="w-full max-h-60 relative rounded-3xl overflow-hidden flex items-center justify-center shadow-lg">
        <Image
          src={photoInfo.largeThumbnail}
          alt={photoInfo.filename || ''}
          width={photoInfo.width}
          height={photoInfo.height}
          blurDataURL={photoInfo.smallThumbnail}
          placeholder="blur"
        />
        <div className="group absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-end justify-end">
          <OpenInNewWindowIcon
            onClick={() => JumpPhoto(photoInfo.id)}
            className="mr-2 mb-2 opacity-0 group-hover:opacity-100 "
          />
        </div>
      </div>
      <div className="p-3">
        <ExifTagList exifData={photoInfo.exif} />
        <b className="mt-2 block text-sm">{photoInfo.exif?.model}</b>
        <p className="text-xs text-default-500">{photoInfo.exif?.lensModel}</p>
        <p className="text-tiny mt-1">{formatTakenDate(photoInfo.takenAt)}</p>
        <LocationInfo
          onClick={onClickLocation}
          photoLocation={photoInfo.location}
        />
      </div>
    </motion.div>
  </>
);

// 多图展示
const MultiImageSkeleton = () => (
  <div className="p-4">
    <Skeleton className="w-1/2 h-6 rounded-lg bg-default-300"></Skeleton>
    <div className="grid grid-cols-3 gap-1 mt-2">
      {new Array(6).fill(0).map((item, i) => (
        <Skeleton
          key={i}
          className="aspect-square rounded-lg shadow-lg"
        ></Skeleton>
      ))}
    </div>
  </div>
);
const MultiImage = ({
  photoList,
  onClickLocation
}: {
  photoList: PhotoDetail[];
  onClickLocation: () => void;
}) => {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, z: 10 }}
        animate={{ opacity: 1, z: 10 }}
        transition={{ delay: 0.1 }}
        className="p-4"
      >
        <h4 className="font-bold">{photoList.length} 张照片</h4>
        <div className="grid grid-cols-3 gap-1 mt-2">
          {photoList.slice(0, 8).map((photo, index) => (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              key={photo.id}
              className="aspect-square relative rounded-lg overflow-hidden flex items-center justify-center shadow-lg"
            >
              <Image
                src={photo.largeThumbnail}
                alt={photo.filename || ''}
                width={photo.width}
                height={photo.height}
                blurDataURL={photo.smallThumbnail}
                placeholder="blur"
              />
              <div className="group absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                <OpenInNewWindowIcon
                  onClick={() => JumpPhoto(photo.id)}
                  className="opacity-0 group-hover:opacity-100 "
                />
              </div>
            </motion.div>
          ))}
          {photoList.length > 8 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * 8 }}
              className="aspect-square rounded-lg shadow-lg flex items-center justify-center
                text-xl cursor-pointer border border-foreground/20
                hover:bg-foreground/10 transition-all duration-200
              "
            >
              +{photoList.length - 8}
            </motion.div>
          )}
        </div>
        <LocationInfo
          onClick={onClickLocation}
          photoLocation={photoList[0].location}
        />
      </motion.div>
    </>
  );
};

const LocationInfo = ({
  photoLocation,
  onClick
}: {
  photoLocation?: PhotoLocation;
  onClick: () => void;
}) => {
  if (!photoLocation) {
    return null;
  }
  return (
    <>
      <div className="mt-3 flex gap-1 items-center justify-between">
        <div>
          <div className="text-xs">
            {photoLocation.latitudeDMS} , {photoLocation.longitudeDMS}
          </div>
          <div className="text-xs text-default-500">
            {photoLocation.address || ''}
          </div>
        </div>
        <MoveLocationIcon onClick={onClick} variant="flat" color="primary" />
      </div>
    </>
  );
};
