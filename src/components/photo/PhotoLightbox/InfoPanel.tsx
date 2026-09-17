'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

import { PhotoItem } from '@/types';
import {
  formatAltitude,
  formatDimension,
  formatExposureTime,
  formatExposurebias,
  formatFNumber,
  formatFileSize,
  formatFocalLength,
  formatIso,
  formatLatLng,
  formatTakenDate
} from '@/utils/format';
import { SingleMarker } from '@/components/Map';
import {
  ApertureIcon,
  ExposureTimeIcon,
  FocalLengthIcon,
  IsoIcon
} from '@/components/Icons/icon';
import { IconButton } from './IconButton';

/** 读数标签前的图标尺寸。略大于 11px 的 mono 文字，两者并排才平衡 */
const ICON_SIZE = 13;

/**
 * 主读数：一个大号等宽数字，下方是图标与极小标签。
 *
 * 取相机机顶屏的写法 —— 摄影参数天然是"读数"而不是表格字段，
 * 用大小对比建立层次，不靠格线与两栏对齐。
 * 图标与标签同处一行、共用最淡的一档颜色：它是标签的视觉前缀，
 * 不该单独占一层，否则读数区会被撑成三层、又回到格子的观感。
 */
function Readout({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0">
      <p
        className={clsx(
          'text-[21px] leading-none tabular-nums tracking-[-0.02em]',
          'text-lab-paper dark:text-lab-on-media',
          "[font-variation-settings:'wght'_620]"
        )}
      >
        {value}
      </p>
      <p
        className={clsx(
          'lab-mono mt-2 flex items-center gap-1.5',
          'text-lab-faint dark:text-lab-on-media-muted/70'
        )}
      >
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        {label}
      </p>
    </div>
  );
}

/** 段落标题。英文短词，正好用得上 lab-mono 的等宽与宽字距 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="lab-mono mb-3 text-lab-faint dark:text-lab-on-media-muted/70">
      {children}
    </p>
  );
}

/**
 * 次要细节的流式行：用间隔点串成一句，而不是每项独占一行。
 * 白平衡、测光这类参数看的人少，压成一条读数带即可，
 * 逐行列出会让它们占到和主参数同等的视觉重量。
 */
function DetailFlow({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <p
      className={clsx(
        'lab-mono normal-case leading-relaxed tracking-[0.06em]',
        'text-lab-muted dark:text-lab-on-media-muted'
      )}
    >
      {items.join('  ·  ')}
    </p>
  );
}

interface InfoPanelProps {
  photo: PhotoItem;
  onClose: () => void;
}

/**
 * 拍摄信息面板。
 *
 * 版式取自相机的机顶屏与器材铭牌，不是数据表：
 * 曝光四要素以大号等宽数字横排在最上，一眼可读；
 * 机身与镜头像铭牌一样直接刻出型号，不配标签（型号本身自带语义）；
 * 白平衡、测光、尺寸这些压成一条流式读数带；
 * 地点则以地名领起，坐标退居其后。
 *
 * 整个面板只有一条分隔线（曝光区与地点区之间）—— 分隔线是最后手段，
 * 分组优先靠留白和字号差。早前版本给每一行都收一条细线、
 * 再把参数塞进 2×2 单元格，读起来就是一张表格。
 */
export function InfoPanel({ photo, onClose }: InfoPanelProps) {
  /**
   * 直接用列表已经带下来的数据，不再请求详情。
   *
   * 照片墙的列表接口带了 withLocation / withExif / withAiAnalysis，
   * 面板要的字段（EXIF、地点、标签）全在其中，且列表与详情走同一个
   * transformPhoto，结构一致。再请求一次只是让面板多等一个往返。
   */
  const exif = photo.photoExif;
  const location = photo.location;
  const tags = photo.photoAiAnalysis?.tags;

  // 曝光四要素：缺失项直接不占位，剩几项排几项
  const readouts = [
    {
      key: 'aperture',
      icon: <ApertureIcon size={ICON_SIZE} />,
      label: 'Aperture',
      value: formatFNumber(exif?.fNumber)
    },
    {
      key: 'shutter',
      icon: <ExposureTimeIcon size={ICON_SIZE} />,
      label: 'Shutter',
      value: formatExposureTime(exif?.exposureTime)
    },
    {
      key: 'iso',
      icon: <IsoIcon size={ICON_SIZE} />,
      label: 'ISO',
      value: formatIso(exif?.iso)
    },
    {
      key: 'focal',
      icon: <FocalLengthIcon size={ICON_SIZE} />,
      label: 'Focal',
      value: formatFocalLength(
        exif?.focalLengthIn35mmFormat || exif?.focalLength
      )
    }
  ].filter((item) => Boolean(item.value));

  // 次要参数压成一条流式读数带
  const details = [
    exif?.whiteBalance && `WB ${exif.whiteBalance}`,
    exif?.meteringMode,
    formatExposurebias(exif?.exposureBias),
    formatDimension(exif?.exifImageWidth || 0, exif?.exifImageHeight || 0),
    formatFileSize(photo.size || 0)
  ].filter((item): item is string => Boolean(item));

  const place = [location?.city, location?.district]
    .filter(Boolean)
    .join(' · ');
  const latLng = formatLatLng(location);
  const altitude = formatAltitude(exif?.altitude);
  const hasMap = Boolean(location?.latitude && location?.longitude);

  return (
    <div
      className={clsx(
        'pointer-events-auto ml-auto mr-4 w-[min(360px,calc(100vw-2rem))] wide:mr-6',
        'flex max-h-[min(60dvh,560px)] flex-col overflow-hidden',
        /**
         * 不描边，靠底色抬升与投影浮起来。
         *
         * bg-lab-raised 两个主题都取"抬升面"：亮色是纯白，暗色是比查看器
         * 底色（lab-viewer-ink）亮一档的 0.185 —— 描边去掉之后，暗色就靠
         * 这一档亮度差把面板从背景里托出来，否则两者同色会糊成一片。
         *
         * 投影分三层：贴边一层交代厚度，中远两层给大范围的悬浮感。
         * 暗色的投影要压得更黑：深底之上浅色的落影几乎看不见。
         */
        'bg-lab-raised',
        'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08),0_18px_44px_-12px_rgba(0,0,0,0.18),0_36px_80px_-28px_rgba(0,0,0,0.14)]',
        'dark:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.55),0_36px_80px_-28px_rgba(0,0,0,0.45)]'
      )}
    >
      {/* 头部：文件名与日期，是这张照片的"身份"，与下方参数分开 */}
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3
            className={clsx(
              'truncate text-[13px]',
              'text-lab-paper dark:text-lab-on-media',
              "[font-variation-settings:'wght'_600]"
            )}
          >
            {photo.filename}
          </h3>
          <p className="lab-mono mt-1.5 text-lab-faint dark:text-lab-on-media-muted/70">
            {formatTakenDate(photo.takenAt)}
          </p>
        </div>

        {/* 移动端 44px 保证可点，桌面收到 32px */}
        <IconButton
          label="收起拍摄信息"
          onClick={onClose}
          className="-mr-2.5 -mt-2 h-11 w-11 wide:-mr-2 wide:-mt-1 wide:h-8 wide:w-8"
        >
          <X className="h-[18px] w-[18px] wide:h-4 wide:w-4" />
        </IconButton>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
        {/* 曝光：整个面板的视觉焦点 */}
        {readouts.length > 0 && (
          <div className="flex flex-wrap gap-x-7 gap-y-5">
            {readouts.map((item) => (
              <Readout
                key={item.key}
                icon={item.icon}
                label={item.label}
                value={item.value as string | number}
              />
            ))}
          </div>
        )}

        {/* 器材铭牌：型号自带语义，不加"相机/镜头"这类标签 */}
        {(exif?.model || exif?.lensModel) && (
          <div className="mt-6">
            {exif?.model && (
              <p
                className={clsx(
                  'text-[14px] leading-snug',
                  'text-lab-paper dark:text-lab-on-media',
                  "[font-variation-settings:'wght'_560]"
                )}
              >
                {exif.model}
              </p>
            )}
            {exif?.lensModel && (
              <p className="mt-1 text-[12px] leading-snug text-lab-muted dark:text-lab-on-media-muted">
                {exif.lensModel}
              </p>
            )}
          </div>
        )}

        {details.length > 0 && (
          <div className="mt-4">
            <DetailFlow items={details} />
          </div>
        )}

        {/* 唯一的分隔线：曝光/器材 与 地点 是两件不同的事，值得一条线 */}
        {(place || latLng) && (
          <>
            <div className="my-6 h-px bg-lab-line dark:bg-lab-on-media/12" />

            <section>
              <SectionLabel>Where</SectionLabel>

              {place && (
                <p
                  className={clsx(
                    'text-[14px]',
                    'text-lab-paper dark:text-lab-on-media',
                    "[font-variation-settings:'wght'_560]"
                  )}
                >
                  {place}
                </p>
              )}

              <DetailFlow
                items={[latLng, altitude, exif?.bearingDirection ?? ''].filter(
                  (item): item is string => Boolean(item)
                )}
              />

              {hasMap && (
                <div className="mt-3.5 h-28 overflow-hidden border border-lab-line dark:border-lab-on-media/15">
                  <SingleMarker
                    point={[location!.longitude, location!.latitude]}
                    photoId={photo.id}
                  />
                </div>
              )}
            </section>
          </>
        )}

        {tags && tags.length > 0 && (
          <section className="mt-6">
            <SectionLabel>Tags</SectionLabel>
            {/* 无描边的浅底小块：描边小块在这套版式里又会变成一个个格子 */}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={clsx(
                    'px-2.5 py-1 text-[11px]',
                    'bg-lab-sunken text-lab-muted',
                    'dark:bg-lab-on-media/10 dark:text-lab-on-media-muted'
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
