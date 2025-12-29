import React from 'react';
import {
  Camera,
  BarChart3,
  CircleX,
  ExposureTimeIcon,
  IsoIcon,
  FocalLengthIcon
} from '@/components/Icons/icon';
import {
  formatExposureTime,
  formatFNumber,
  formatIso,
  formatFocalLength,
  formatFileSize
} from '@/utils/format';

import { PhotoDetail } from '@/types';
import { ApertureIcon } from 'lucide-react';

type IconProps = React.FC<{ size: number; className: string }>;
const StatItem = ({
  icon: Icon,
  label,
  value
}: {
  icon: IconProps;
  label: string;
  value: string | number;
}) => (
  <div className="flex flex-col items-center justify-center p-2 bg-foreground/[0.03] backdrop-blur-xl rounded-2xl border border-foreground/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-foreground/[0.08] transition-all duration-300">
    <Icon size={16} className="text-foreground/50 mb-1.5" />
    <span className="text-xs text-foreground/50 uppercase font-bold tracking-[0.1em]">
      {label}
    </span>
    <span className="text-xs font-semibold text-foreground mt-0.5">
      {value}
    </span>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-foreground/[0.04] last:border-0">
    <span className="text-xs text-foreground/60 font-medium">{label}</span>
    <span className="text-xs font-semibold text-foreground truncate ml-4 max-w-[170px] text-right tracking-tight">
      {value}
    </span>
  </div>
);

export const ExifInfo = ({
  photoDetail,
  setIsOpen
}: {
  photoDetail: PhotoDetail;
  setIsOpen: (isOpen: boolean) => void;
}) => {
  console.log(photoDetail);
  return (
    <div className="w-[300px] relative ">
      <div className="relative w-full bg-background/40 backdrop-blur-[40px] rounded-[2.2rem] border border-foreground/[0.1] shadow-2xl overflow-hidden flex flex-col">
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
            {photoDetail.originName}
          </h2>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* 参数网格 */}
          <div className="grid grid-cols-2 gap-2">
            <StatItem
              icon={ExposureTimeIcon as IconProps}
              label="快门"
              value={formatExposureTime(photoDetail.exposureTime)}
            />
            <StatItem
              icon={ApertureIcon as IconProps}
              label="光圈"
              value={formatFNumber(photoDetail.fNumber)}
            />
            <StatItem
              icon={IsoIcon as IconProps}
              label="ISO"
              value={formatIso(photoDetail.iso)}
            />
            <StatItem
              icon={FocalLengthIcon as IconProps}
              label="焦距"
              value={formatFocalLength(photoDetail.focalLengthIn35MmFilm)}
            />
          </div>

          {/* 硬件信息 */}
          <section className="space-y-2">
            <div className="px-1">
              <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em] mb-3">
                Hardware
              </h3>
              <div className="bg-foreground/[0.02] rounded-2xl px-4 py-1 border border-foreground/[0.04]">
                <InfoRow
                  label="相机"
                  value={photoDetail.exif?.ImageMake || ''}
                />
                <InfoRow
                  label="镜头"
                  value={photoDetail.exif?.EXIFLensmodel || ''}
                />
                <InfoRow
                  label="色彩"
                  value={photoDetail.exif?.EXIFColorspace || ''}
                />
              </div>
            </div>

            {/* 直方图 */}
            <div className="px-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em]">
                  Levels
                </h3>
                <BarChart3 size={12} className="text-foreground/40" />
              </div>
              <div className="h-12 flex items-end gap-[1.5px] bg-background/20 p-2 rounded-2xl border border-foreground/[0.03]">
                {[...Array(32)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-indigo-500/20 to-white/40 rounded-full"
                    style={{ height: `${15 + Math.random() * 85}%` }}
                  />
                ))}
              </div>
            </div>

            {/* 地图 */}
            {/* <div className="px-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
                  Geo tagging
                </h3>
                <span className="text-[9px] text-white/20 font-mono">
                  {ExifData.coordinates}
                </span>
              </div>
              <div className="relative h-20 bg-white/[0.03] rounded-[1.5rem] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white] border-[2px] border-indigo-600/50" />
                  <span className="text-[9px] font-bold text-white/60 mt-1.5 px-2 py-0.5 bg-white/[0.05] backdrop-blur-md rounded-full">
                    {ExifData.location}
                  </span>
                </div>
              </div>
            </div> */}
          </section>
        </div>

        <div className="mt-auto px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] flex justify-between items-center">
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
            Captured
          </span>
          <span className="text-[10px] text-white/50 font-mono">
            {/* {ExifData.dateTime} */}
          </span>
        </div>
      </div>
    </div>
  );
};
