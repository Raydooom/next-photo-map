'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

import { PhotoItem } from '@/lib/types';
import { formatTakenDate } from '@/lib/format';
import { extractPhotoMeta, type ExposureKey } from '@/lib/photoMeta';
import { SingleMarker } from '@/components/map';
import {
  ApertureIcon,
  ExposureTimeIcon,
  FocalLengthIcon,
  IsoIcon
} from '@/components/Icons/icon';

const ICON_SIZE = 14;

interface PhotoMetaSectionsProps {
  photo: PhotoItem;
  showDate?: boolean;
  showTheme?: boolean;
  showMap?: boolean;
  className?: string;
  whereClassName?: string;
  readoutLayoutClassName?: string;
}

interface PhotoMetaHeaderProps {
  photo: PhotoItem;
  className?: string;
}

const EXPOSURE_ICONS: Record<ExposureKey, (size: number) => ReactNode> = {
  aperture: (size) => <ApertureIcon size={size} />,
  shutter: (size) => <ExposureTimeIcon size={size} />,
  iso: (size) => <IsoIcon size={size} />,
  focal: (size) => <FocalLengthIcon size={size} />
};

/** 两种查看器共用的固定身份头：文件名、AI 主题与拍摄日期。 */
export function PhotoMetaHeader({ photo, className }: PhotoMetaHeaderProps) {
  const theme = photo.photoAiAnalysis?.theme;

  return (
    <div className={clsx('min-w-0', className)}>
      <h3
        className={clsx(
          'truncate text-[15px] leading-snug',
          'text-lab-paper dark:text-lab-on-media',
          "[font-variation-settings:'wght'_600]"
        )}
      >
        {photo.filename}
      </h3>
      {theme && (
        <p className="mt-1 text-[13px] leading-relaxed text-lab-muted dark:text-lab-on-media-muted">
          {theme}
        </p>
      )}
      <p className="lab-mono mt-2 text-[13px] text-lab-faint dark:text-lab-on-media-muted/70">
        {formatTakenDate(photo.takenAt)}
      </p>
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="lab-mono mb-3 text-[12px] text-lab-faint dark:text-lab-on-media-muted/70">
      {children}
    </p>
  );
}

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
          'text-[21px] leading-none tabular-nums tracking-[-0.02em]',
          'text-lab-paper dark:text-lab-on-media',
          "[font-variation-settings:'wght'_620]"
        )}
      >
        {value}
      </p>
      <p className="lab-mono mt-2 flex items-center gap-1.5 text-[12px] text-lab-faint dark:text-lab-on-media-muted/70">
        <span aria-hidden className="shrink-0">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

function DetailFlow({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <p className="lab-mono text-[13px] normal-case leading-relaxed tracking-[0.06em] text-lab-muted dark:text-lab-on-media-muted">
      {items.join('  ·  ')}
    </p>
  );
}

/** 两种照片查看器共用的可滚动内容，顺序固定为曝光、设备、地点、主题、标签。 */
export function PhotoMetaSections({
  photo,
  showDate = true,
  showTheme = true,
  showMap = false,
  className,
  whereClassName,
  readoutLayoutClassName = 'grid grid-cols-2 gap-x-5 gap-y-5'
}: PhotoMetaSectionsProps) {
  const meta = extractPhotoMeta(photo);
  const hasGear = Boolean(meta.model || meta.lensModel);
  const locationDetails = [meta.altitude, meta.bearingDirection].filter(Boolean);
  const hasWhereDetails = Boolean(meta.latLng || locationDetails.length > 0);
  const hasMap = Boolean(photo.location?.latitude && photo.location?.longitude);

  const exposureSection =
    meta.readouts.length > 0 ? (
      <section>
        <GroupLabel>Exposure</GroupLabel>
        <div className={readoutLayoutClassName}>
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
    ) : null;

  const gearSection =
    hasGear || meta.captureDetails.length > 0 || meta.fileDetails.length > 0 ? (
      <section className="border-t border-lab-line pt-5 wide:pt-6">
        <GroupLabel>Gear</GroupLabel>

        {meta.model && (
          <p
            className={clsx(
              'text-[15px] leading-snug',
              'text-lab-paper dark:text-lab-on-media',
              "[font-variation-settings:'wght'_560]"
            )}
          >
            {meta.model}
          </p>
        )}
        {meta.lensModel && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-lab-muted dark:text-lab-on-media-muted">
            {meta.lensModel}
          </p>
        )}

        {(meta.captureDetails.length > 0 || meta.fileDetails.length > 0) && (
          <div className={clsx(hasGear && 'mt-3')}>
            <DetailFlow items={meta.captureDetails} />
            {meta.fileDetails.length > 0 && (
              <div className={clsx(meta.captureDetails.length > 0 && 'mt-1')}>
                <DetailFlow items={meta.fileDetails} />
              </div>
            )}
          </div>
        )}
      </section>
    ) : null;

  const whereSection =
    meta.place || showDate || hasWhereDetails || (showMap && hasMap) ? (
      <section className={clsx('border-t border-lab-line pt-5 wide:pt-6', whereClassName)}>
        <GroupLabel>Where &amp; When</GroupLabel>

        {meta.place && (
          <p
            className={clsx(
              'text-[15px] leading-snug',
              'text-lab-paper dark:text-lab-on-media',
              "[font-variation-settings:'wght'_560]"
            )}
          >
            {meta.place}
          </p>
        )}

        {showDate && (
          <p className="lab-mono mt-2 text-[13px] text-lab-muted dark:text-lab-on-media-muted">
            {formatTakenDate(photo.takenAt)}
          </p>
        )}

        {hasWhereDetails && (
          <div className="mt-2.5">
            {meta.latLng && <DetailFlow items={[meta.latLng]} />}
            {locationDetails.length > 0 && (
              <div className={clsx(meta.latLng && 'mt-1')}>
                <DetailFlow items={locationDetails} />
              </div>
            )}
          </div>
        )}

        {showMap && hasMap && (
          <div className="mt-3.5 h-28 overflow-hidden border border-lab-line dark:border-lab-on-media/15">
            <SingleMarker
              point={[photo.location!.longitude, photo.location!.latitude]}
              photoId={photo.id}
            />
          </div>
        )}
      </section>
    ) : null;

  const themeSection =
    showTheme && meta.theme ? (
      <section className="border-t border-lab-line pt-5 wide:pt-6">
        <GroupLabel>Theme</GroupLabel>
        <p
          className={clsx(
            'text-[15px] leading-relaxed',
            'text-lab-paper dark:text-lab-on-media',
            "[font-variation-settings:'wght'_560]"
          )}
        >
          {meta.theme}
        </p>
      </section>
    ) : null;

  const tagsSection =
    meta.tags.length > 0 ? (
      <section className="border-t border-lab-line pt-5 wide:pt-6">
        <GroupLabel>Tags</GroupLabel>
        <div className="flex flex-wrap gap-2">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="bg-lab-sunken px-3 py-1.5 text-[13px] leading-none text-lab-muted dark:bg-lab-on-media/10 dark:text-lab-on-media-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div className={clsx('flex flex-col gap-5 wide:gap-6', className)}>
      {[exposureSection, gearSection, whereSection, themeSection, tagsSection].map(
        (section, index) => (section ? <div key={index}>{section}</div> : null)
      )}
    </div>
  );
}
