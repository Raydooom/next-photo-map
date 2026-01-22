'use client';
import { ClusterPointIcon } from '@/components/Icons/button';
import { useEffect, useMemo, useState } from 'react';
import { PhotoLocation } from '@/types';
import clsx from 'clsx';
import { PointDirectionIcon } from '@/components/Icons/icon';

export type ClusterPointData = {
  isCluster?: boolean;
  pointCount?: number;
  data: {
    count: number;
    bPoint: [number, number];
    list: PhotoLocation[];
  };
};
export default function ClusterPoint({
  activeId,
  data: clusterData,
  onClick
}: {
  activeId?: number;
  data: ClusterPointData;
  onClick?: (data: ClusterPointData['data']) => void;
}) {
  const { data, isCluster, pointCount } = clusterData;

  const [isActive, setIsActive] = useState(false);
  // 更新激活点，有错位，暂不高亮
  // useEffect(() => {
  //   const activeItem = data?.list?.find(item => item.id === activeId);
  //   setIsActive(Boolean(activeItem));
  // }, [activeId, data, onClick]);
  const deg = useMemo(() => {
    if (data?.list?.length === 1) {
      return data.list[0].bearing
        ? parseInt(String(data.list[0].bearing), 10)
        : null;
    }
  }, [data]);
  return (
    <>
      {isCluster ? (
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            bg-brand-primary backdrop-blur-button border border-brand-primary/[0.2]
            shadow-lg overflow-hidden
            hover:scale-105 transition-transform duration-200
          `}
        >
          <div className="relative w-full h-full p-1.5">
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
        </div>
      ) : (
        <>
          {deg ? (
            <div
              className="text-white w-full h-full text-xl absolute z-10 pointer-events-none"
              style={{
                transform: `rotate(${deg}deg)`
              }}
            >
              <PointDirectionIcon className="absolute -top-1.5 left-1/2 -translate-x-1/2" />
            </div>
          ) : null}
          <ClusterPointIcon
            onClick={() => onClick?.(data)}
            className={clsx(
              'bg-brand-primary border border-brand-primary/[0.2] text-xl text-white',
              isActive && 'bg-brand-highlight text-white'
            )}
          />
        </>
      )}
    </>
  );
}
