'use client';
import { RowInfo } from '@/components/modules/RowInfo';
import { ExifData, PhotoDetail } from '@/types';
import * as Action from '@/services/actions';
import { useEffect, useState } from 'react';
import { Card } from '@heroui/card';
import { LocationIcon } from '@/components/Icons/icon';
import { formatLatLng } from '@/utils/format';
import Image from 'next/image';
import { CloseIcon, OpenInNewWindowIcon } from '@/components/Icons/button';
import { ExifTagList } from '@/components/modules/ExifTag';
import { Skeleton } from '@heroui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

export const PointDetail = ({
  viewList,
  onClose
}: {
  viewList: ExifData[];
  onClose: () => void;
}) => {
  const [photoList, setPhotoList] = useState<PhotoDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (viewList.length === 0) return;
    setIsLoading(true);
    const photoIds = viewList.map(item => item.photoId);
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

  const JumpPhoto = (photoId: number) => {
    window.open(`/photos?photoId=${photoId}`, '_blank');
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
                  <motion.div
                    initial={{ opacity: 0, z: 10 }}
                    animate={{ opacity: 1, z: 10 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-full max-h-80 relative rounded-3xl overflow-hidden flex items-center justify-center shadow-lg">
                      <Image
                        src={photoList[0].url}
                        alt={photoList[0].filename || ''}
                        width={photoList[0].width}
                        height={photoList[0].height}
                        blurDataURL={photoList[0].smallThumbnail || photoList[0].url}
                        placeholder="blur"
                      />
                      <div className="group absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-end justify-end">
                        <OpenInNewWindowIcon
                          onClick={() => JumpPhoto(photoList[0].id)}
                          className="mr-2 mb-2 opacity-0 group-hover:opacity-100 "
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <ExifTagList photo={photoList[0]} />
                      <b className="mt-4 block text-sm">
                        {photoList[0].exif?.model}
                      </b>
                      <p className="text-xs text-default-500">
                        {photoList[0].exif?.lensModel}
                      </p>
                      <p className="text-tiny mt-1">
                        {photoList[0].takenAt}
                      </p>
                      <div className="mt-3 flex flex-col gap-1 items-flex-start">
                        <RowInfo
                          icon={
                            <LocationIcon className="flex-shrink-0" size={14} />
                          }
                          value={formatLatLng(photoList[0]?.exif)}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div>123</div>
            )}
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

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
