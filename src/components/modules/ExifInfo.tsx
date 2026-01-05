import React, { useEffect, useState, memo } from 'react';
import {
  Camera,
  CircleX,
  ExposureTimeIcon,
  IsoIcon,
  FocalLengthIcon,
  MarkerIcon
} from '@/components/Icons/icon';
import {
  formatExposureTime,
  formatFNumber,
  formatIso,
  formatFocalLength,
  formatFileSize,
  formatExposurebias,
  formatPixel,
  formatDimension,
  formatLatLng,
  formatDirection,
  formatAltitude
} from '@/utils/format';

import { PhotoItem, ExifType } from '@/types';
import { ApertureIcon } from 'lucide-react';
import * as Actions from '@/services/actions';
import { Marker } from '../Map';

type IconProps = React.FC<{ size: number; className: string }>;
const StatItem = ({
  icon: Icon,
  label,
  value
}: {
  icon: IconProps;
  label: string;
  value?: string | number;
}) =>
  value ? (
    <div className="flex flex-col items-center justify-center p-2 bg-foreground/[0.03] backdrop-blur-xl rounded-2xl border border-foreground/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-foreground/[0.08] transition-all duration-300">
      <Icon size={16} className="text-foreground/50 mb-1.5" />
      <span className="text-xs text-foreground/50 uppercase font-bold tracking-[0.1em]">
        {label}
      </span>
      <span className="text-xs font-semibold text-foreground mt-0.5">
        {value}
      </span>
    </div>
  ) : null;

const InfoRow = ({
  label,
  value
}: {
  label: string;
  value: string | number | undefined;
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
    const [exifData, setExifData] = useState<ExifType | undefined>(undefined);
    useEffect(() => {
      Actions.getPhotoExtendInfo(photo.id).then(res => {
        setExifData(res.exifData);
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
            {photo.originName}
          </h2>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* 参数网格 */}
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              icon={ExposureTimeIcon as IconProps}
              label="快门"
              value={formatExposureTime(photo.exposureTime)}
            />
            <StatItem
              icon={ApertureIcon as IconProps}
              label="光圈"
              value={formatFNumber(photo.fNumber)}
            />
            <StatItem
              icon={IsoIcon as IconProps}
              label="ISO"
              value={formatIso(photo.iso)}
            />
            <StatItem
              icon={FocalLengthIcon as IconProps}
              label="焦距"
              value={formatFocalLength(
                photo.focalLengthIn35MmFilm || photo.focalLength
              )}
            />
          </div>

          {/* 拍摄信息 */}
          <section className="space-y-2">
            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Shooting
              </h3>
              <div className="bg-foreground/[0.08] rounded-2xl px-4">
                <InfoRow label="相机" value={exifData?.ImageModel} />
                <InfoRow label="镜头" value={exifData?.EXIFLensmodel} />
                <InfoRow
                  label="焦距"
                  value={formatFocalLength(exifData?.EXIFFocallength)}
                />
                <InfoRow
                  label="等效 35mm"
                  value={formatFocalLength(exifData?.EXIFFocallengthin35Mmfilm)}
                />
                <InfoRow
                  label="曝光补偿"
                  value={formatExposurebias(exifData?.EXIFExposurebiasvalue)}
                />
                <InfoRow label="白平衡" value={exifData?.EXIFWhitebalance} />
                <InfoRow label="测光模式" value={exifData?.EXIFMeteringmode} />
                <InfoRow
                  label="尺寸"
                  value={formatDimension(
                    exifData?.EXIFExifimagewidth,
                    exifData?.EXIFExifimagelength
                  )}
                />
                <InfoRow
                  label="像素"
                  value={formatPixel(
                    exifData?.EXIFExifimagewidth,
                    exifData?.EXIFExifimagelength
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
                  value={formatAltitude(exifData?.GPSGpsaltitude)}
                />
                <InfoRow
                  label="拍摄朝向"
                  value={formatDirection(exifData?.GPSGpsimgdirection)}
                />
              </div>
              {exifData &&
                exifData.GPSGpslatitude &&
                exifData.GPSGpslongitude && (
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
            {exifData?.EXIFDatetimeoriginal}
          </span>
        </div>
      </div>
    );
  }
);
