import React, { useEffect, useState, memo } from 'react';
import { Camera, CircleX } from '@/components/Icons/icon';
import {
  formatFocalLength,
  formatFileSize,
  formatExposurebias,
  formatPixel,
  formatDimension,
  formatLatLng,
  formatAltitude,
  formatTakenDate
} from '@/utils/format';

import { PhotoItem } from '@/types';
import * as Actions from '@/server/actions/index';
import { ExifTagList } from './ExifTag';
import { SingleMarker } from '../Map';
import { Chip } from '@heroui/chip';

const InfoRow = ({
  label,
  value
}: {
  label: string;
  value: string | number | undefined | null;
}) =>
  value ? (
    <div className="flex justify-between items-center py-2.5 border-b border-foreground/[0.04] last:border-0">
      <span className="text-xs text-foreground/60 font-medium">{label}</span>
      <span className="text-xs font-semibold text-foreground truncate ml-3 max-w-[180px] text-right tracking-tight">
        {value}
      </span>
    </div>
  ) : null;

export const ExtendInfo = memo(
  ({
    photo,
    setIsOpen
  }: {
    photo: PhotoItem;
    setIsOpen: (isOpen: boolean) => void;
  }) => {
    const [photoItem, setPhotoItem] = useState<Partial<PhotoItem> | null>(null);
    useEffect(() => {
      Actions.getPhotoDetail(photo.id).then(data => {
        setPhotoItem(data);

        console.log('👾 ~ :49 ~ datalog:', data);
      });
    }, [photo.id]);

    return (
      <div className="relative w-[300px] max-h-[70vh] bg-background/60 backdrop-blur-[40px] rounded-[2.2rem] border-glass shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-foreground/[0.05] border-glass rounded-lg">
                <Camera size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/60">
                information
              </span>
            </div>
            <CircleX
              onClick={() => setIsOpen(false)}
              size={20}
              className="text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
            />
          </div>
          <h2 className="text-sm font-bold text-foreground/95 tracking-tight">
            {photo.filename}
          </h2>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* 参数网格 */}
          <ExifTagList exifData={photoItem?.photoExif || null} />

          {/* 拍摄信息 */}
          <section className="space-y-2">
            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Shooting
              </h3>
              <div className="bg-foreground/[0.08] rounded-2xl px-4">
                <InfoRow label="相机" value={photoItem?.photoExif?.model} />
                <InfoRow label="镜头" value={photoItem?.photoExif?.lensModel} />
                <InfoRow
                  label="焦距"
                  value={formatFocalLength(photoItem?.photoExif?.focalLength)}
                />
                <InfoRow
                  label="等效 35mm"
                  value={formatFocalLength(
                    photoItem?.photoExif?.focalLengthIn35mmFormat
                  )}
                />
                <InfoRow
                  label="曝光补偿"
                  value={formatExposurebias(photoItem?.photoExif?.exposureBias)}
                />
                <InfoRow
                  label="白平衡"
                  value={photoItem?.photoExif?.whiteBalance}
                />
                <InfoRow
                  label="测光模式"
                  value={photoItem?.photoExif?.meteringMode}
                />
                <InfoRow
                  label="尺寸"
                  value={formatDimension(
                    photoItem?.photoExif?.exifImageWidth || 0,
                    photoItem?.photoExif?.exifImageHeight || 0
                  )}
                />
                <InfoRow
                  label="像素"
                  value={formatPixel(
                    photoItem?.photoExif?.exifImageWidth || 0,
                    photoItem?.photoExif?.exifImageHeight || 0
                  )}
                />
                <InfoRow
                  label="文件大小"
                  value={formatFileSize(photoItem?.size || 0)}
                />
              </div>
            </div>

            {/* 地图 */}
            {formatLatLng(photoItem?.location) && (
              <div className="px-1">
                <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                  Location
                </h3>
                <div className="bg-foreground/[0.08] rounded-2xl px-4">
                  <InfoRow
                    label="经纬度"
                    value={formatLatLng(photoItem?.location)}
                  />
                  <InfoRow
                    label="海拔"
                    value={formatAltitude(photoItem?.photoExif?.altitude)}
                  />
                  <InfoRow
                    label="拍摄朝向"
                    value={photoItem?.photoExif?.bearingDirection}
                  />
                </div>
                {photoItem?.location?.latitude &&
                  photoItem?.location?.longitude && (
                    <div className="rounded w-full border-glass h-40 overflow-hidden mt-4">
                      <SingleMarker
                        point={[
                          photoItem?.location?.longitude as number,
                          photoItem?.location?.latitude as number
                        ]}
                        photoId={photo.id}
                      />
                    </div>
                  )}
              </div>
            )}

            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Tags
              </h3>
              <div className="flex gap-2 flex-wrap">
                {photoItem?.photoAiAnalysis?.tags?.map(tag => (
                  <Chip
                    classNames={{
                      base: 'border-small bg-background-light/30 hover:bg-background-light/80 transition border-glass cursor-pointer',
                      content: 'text-main'
                    }}
                    variant="shadow"
                    key={tag}
                    onClick={() => console.log(123)}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-auto px-6 py-4 bg-background/[0.02] border-t border-foreground/[0.05] flex justify-between items-center">
          <span className="text-xs text-foreground/20 font-bold uppercase tracking-widest">
            Captured
          </span>
          <span className="text-xs text-foreground/50 font-mono">
            {formatTakenDate(photo.takenAt)}
          </span>
        </div>
      </div>
    );
  }
);

ExtendInfo.displayName = 'ExtendInfo';
