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

import { PhotoItem, PhotoExif } from '@/types';
import * as Actions from '@/services/actions';
import { Marker } from '../Map';
import { ExifTagList } from './ExifTag';

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
    const [exifData, setExifData] = useState<PhotoExif | undefined>(undefined);
    useEffect(() => {
      Actions.getPhotoExtendInfo(photo.id).then(data => {
        setExifData(data);
      });
    }, [photo.id]);

    return (
      <div className="relative w-[300px] max-h-[70vh] bg-background/60 backdrop-blur-[40px] rounded-[2.2rem] border border-foreground/[0.1] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 pb-3 border-b border-foreground/[0.1]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-foreground/[0.05] border border-foreground/[0.1] rounded-lg">
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
          <ExifTagList exifData={exifData} />

          {/* 拍摄信息 */}
          <section className="space-y-2">
            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Shooting
              </h3>
              <div className="bg-foreground/[0.08] rounded-2xl px-4">
                <InfoRow label="相机" value={exifData?.model} />
                <InfoRow label="镜头" value={exifData?.lensModel} />
                <InfoRow
                  label="焦距"
                  value={formatFocalLength(exifData?.focalLength)}
                />
                <InfoRow
                  label="等效 35mm"
                  value={formatFocalLength(exifData?.focalLengthIn35mmFormat)}
                />
                <InfoRow
                  label="曝光补偿"
                  value={formatExposurebias(exifData?.exposureBias)}
                />
                <InfoRow label="白平衡" value={exifData?.whiteBalance} />
                <InfoRow label="测光模式" value={exifData?.meteringMode} />
                <InfoRow
                  label="尺寸"
                  value={formatDimension(
                    exifData?.exifImageWidth,
                    exifData?.exifImageHeight
                  )}
                />
                <InfoRow
                  label="像素"
                  value={formatPixel(
                    exifData?.exifImageWidth,
                    exifData?.exifImageHeight
                  )}
                />
                <InfoRow
                  label="文件大小"
                  value={formatFileSize(photo.size || 0)}
                />
              </div>
            </div>

            {/* 地图 */}
            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Location
              </h3>
              <div className="bg-foreground/[0.08] rounded-2xl px-4">
                <InfoRow label="经纬度" value={formatLatLng(exifData)} />
                <InfoRow
                  label="海拔"
                  value={formatAltitude(exifData?.altitude)}
                />
                <InfoRow label="拍摄朝向" value={exifData?.bearingDirection} />
              </div>
              {exifData?.latitude && exifData?.longitude && (
                <div className="rounded-2xl w-full h-40 overflow-hidden mt-2">
                  <Marker exifData={exifData} />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-auto px-6 py-4 bg-background/[0.02] border-t border-foreground/[0.05] flex justify-between items-center">
          <span className="text-xs text-foreground/20 font-bold uppercase tracking-widest">
            Captured
          </span>
          <span className="text-xs text-foreground/50 font-mono">
            {formatTakenDate(exifData?.gpsTimeStamp)}
          </span>
        </div>
      </div>
    );
  }
);
