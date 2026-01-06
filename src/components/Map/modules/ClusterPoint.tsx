import { Camera, DateIcon, LocationIcon } from '@/components/Icons/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/popover';
import { useEffect, useState } from 'react';
import * as Action from '@/services/actions';
import { IconSvgProps, PhotoDetail } from '@/types';
import Image from 'next/image';
import { formatLatLng } from '@/utils/format';

function PointIcon({ data }: { data: any }) {
  const { isCluster, pointCount } = data;
  return (
    <div
      className={`
        w-11 h-11 rounded-full flex items-center justify-center
        bg-brand-primary backdrop-blur-xl border border-brand-primary/60
        shadow-[0_0_15px_rgba(255,255,255,0.2)] overflow-hidden
        hover:scale-105 transition-transform duration-200
      `}
    >
      {isCluster ? (
        // 聚合点：显示图片背景和数字
        <div className="relative w-full h-full p-[5px]">
          <div
            className="w-full h-full rounded-full bg-cover bg-center overflow-hidden"
            style={{
              backgroundImage: `url('/cluster_placeholder.png')`
            }}
          >
            <div className="w-full h-full bg-brand-primary/40 flex items-center justify-center">
              <span className="text-white text-lg font-bold drop-shadow-md">
                {pointCount}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <Camera className="w-6 h-6 text-white" />
      )}
    </div>
  );
}

const InfoRow = ({
  icon: Icon,
  value
}: {
  icon: React.ReactNode;
  value: string | number | undefined;
}) =>
  value ? (
    <dt className="flex items-center gap-1 text-foreground/90 mt-1">
      {Icon}
      <span className="text-xs truncate max-w-full">{value}</span>
    </dt>
  ) : null;

export default function ClusterPoint({ data }: { data: any }) {
  const { images } = data || [];
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [photoDetail, setPhotoDetail] = useState<PhotoDetail | null>(null);

  const onClickPoint = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const photoId = images[0]?.photoId;
      if (!photoId) {
        return;
      }
      Action.getPhotoDetail(photoId).then(data => {
        setPhotoDetail(data);
      });
    }
  };

  return (
    <>
      {data.isCluster ? (
        <PointIcon data={data} />
      ) : (
        <Popover
          showArrow
          isOpen={isOpen}
          onOpenChange={open => onClickPoint(open)}
          classNames={{
            content: 'p-0 overflow-hidden'
          }}
        >
          <PopoverTrigger>
            <div>
              <PointIcon data={data} />
            </div>
          </PopoverTrigger>
          <PopoverContent>
            {photoDetail && (
              <div className="">
                <div className="w-[320px] max-h-[320px] overflow-hidden flex items-center justify-center">
                  <Image
                    src={photoDetail.url}
                    alt={photoDetail.name || ''}
                    width={320}
                    height={200}
                  />
                </div>

                <dl className="p-4 w-[320px] flex flex-col gap-1 items-flex-start">
                  <dt className="font-bold">{photoDetail.name}</dt>
                  <InfoRow
                    icon={<Camera className="flex-shrink-0" size={14} />}
                    value={images[0]?.exifData?.EXIFLensmodel}
                  />
                  <InfoRow
                    icon={<LocationIcon className="flex-shrink-0" size={14} />}
                    value={formatLatLng(images[0]?.exifData)}
                  />
                  <InfoRow
                    icon={<DateIcon className="flex-shrink-0" size={14} />}
                    value={images[0]?.exifData?.EXIFDatetimeoriginal}
                  />
                </dl>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
