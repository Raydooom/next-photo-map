'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

import { PhotoItem } from '@/types';
import { formatTakenDate } from '@/utils/format';
import { extractPhotoMeta, type ExposureKey } from '@/utils/photoMeta';
import {
  ApertureIcon,
  ExposureTimeIcon,
  FocalLengthIcon,
  IsoIcon
} from '@/components/Icons/icon';

/** 读数标签前的图标尺寸，与 11px 的等宽标签并排才平衡 */
const ICON_SIZE = 13;

const EXPOSURE_ICONS: Record<ExposureKey, (size: number) => ReactNode> = {
  aperture: (size) => <ApertureIcon size={size} />,
  shutter: (size) => <ExposureTimeIcon size={size} />,
  iso: (size) => <IsoIcon size={size} />,
  focal: (size) => <FocalLengthIcon size={size} />
};

/** 段落标题 */
function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="lab-mono mb-3 text-lab-faint">{children}</p>;
}

/**
 * 一项曝光读数：大号等宽数字压着一行图标与标签。
 * 取相机机顶屏的写法 —— 摄影参数天然是"读数"，靠字号差建立层次，
 * 不靠格线与两栏对齐。
 */
function Readout({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className={clsx(
          'text-[20px] leading-none tabular-nums tracking-[-0.02em] text-lab-paper',
          "[font-variation-settings:'wght'_620]"
        )}
      >
        {value}
      </p>
      {/* 四列时列宽只有七十来像素，Aperture 这类长标签正好卡在边缘，
          truncate 兜住最坏情形 —— 截断也好过溢出破版 */}
      <p className="lab-mono mt-2 flex items-center gap-1.5 text-lab-faint">
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

/**
 * 次要参数串成一句，用间隔点分隔。
 * 白平衡、测光这类看的人少，压成一条读数带即可，
 * 逐行列出会让它们占到与主参数同等的视觉重量。
 */
function DetailFlow({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <p className="lab-mono normal-case leading-relaxed tracking-[0.06em] text-lab-muted">
      {items.join('  ·  ')}
    </p>
  );
}

/**
 * 参数栏的内容。
 *
 * 排序按足迹页的语境来：地点在最前 —— 读者是从地图上点进来的，
 * "这是哪儿"是他此刻正在追的那条线索；照片墙那边则相反，
 * 那里先看到的是画面，位置是补充。
 *
 * 不放小地图。照片墙的面板里嵌一张是为了交代方位，
 * 而这里退一步就是整幅地图，再嵌一张只是把刚看过的东西又摆一遍。
 */
export function MetaColumn({ photo }: { photo: PhotoItem }) {
  const meta = extractPhotoMeta(photo);
  const hasGear = Boolean(meta.model || meta.lensModel);
  const whereDetails = [
    meta.latLng,
    meta.altitude,
    meta.bearingDirection
  ].filter(Boolean);

  return (
    // 紧凑布局下段间距收一档：纵向是手机上最紧的资源，横向反而有余
    <div className="flex flex-col gap-5 wide:gap-6">
      {/* 何时何地。pr 是给右上角那枚关闭按钮让位 —— 只让这一段缩，
          下面的两列读数仍用足栏宽 */}
      <section className="pr-9">
        <GroupLabel>Where &amp; When</GroupLabel>

        {meta.place && (
          <p
            className={clsx(
              'text-[15px] leading-snug text-lab-paper',
              "[font-variation-settings:'wght'_580]"
            )}
          >
            {meta.place}
          </p>
        )}

        <p className="lab-mono mt-1.5 text-lab-muted">
          {formatTakenDate(photo.takenAt)}
        </p>

        {whereDetails.length > 0 && (
          <div className="mt-2.5">
            <DetailFlow items={whereDetails} />
          </div>
        )}
      </section>

      {/**
       * 曝光四要素。
       * 手机上摊成一行四列：那里横向有余、纵向吃紧，四列比两行省掉一整行；
       * 宽屏的参数栏只有 336px，四列会把读数挤断，故仍排两列。
       */}
      {meta.readouts.length > 0 && (
        <section className="border-t border-lab-line pt-5 wide:pt-6">
          <GroupLabel>Exposure</GroupLabel>
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 wide:grid-cols-2 wide:gap-x-5">
            {meta.readouts.map((item) => (
              <Readout
                key={item.key}
                icon={EXPOSURE_ICONS[item.key](ICON_SIZE)}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
        </section>
      )}

      {/* 器材铭牌：型号自带语义，不加"相机/镜头"这类标签 */}
      {(hasGear || meta.details.length > 0) && (
        <section className="border-t border-lab-line pt-5 wide:pt-6">
          <GroupLabel>Gear</GroupLabel>

          {meta.model && (
            <p
              className={clsx(
                'text-[14px] leading-snug text-lab-paper',
                "[font-variation-settings:'wght'_560]"
              )}
            >
              {meta.model}
            </p>
          )}
          {meta.lensModel && (
            <p className="mt-1 text-[12px] leading-snug text-lab-muted">
              {meta.lensModel}
            </p>
          )}

          {meta.details.length > 0 && (
            <div className={clsx(hasGear && 'mt-3')}>
              <DetailFlow items={meta.details} />
            </div>
          )}
        </section>
      )}

      {meta.tags.length > 0 && (
        <section className="border-t border-lab-line pt-5 wide:pt-6">
          <GroupLabel>Tags</GroupLabel>
          {/* 无描边的浅底小块：描边小块在这套版式里又会变成一个个格子 */}
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="bg-lab-sunken px-2.5 py-1 text-[11px] text-lab-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
