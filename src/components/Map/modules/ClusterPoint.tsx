'use client';
import { ClusterPointIcon } from '@/components/Icons/button';
import { useEffect, useState } from 'react';
import { ExifData } from '@/types';
import clsx from 'clsx';

export type ClusterPointData = {
  isCluster?: boolean;
  pointCount?: number;
  data: {
    id: number;
    count: number;
    point: [number, number];
    list: ExifData[];
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
  useEffect(() => {
    const activeItem = data?.list?.find(item => item.id === activeId);
    setIsActive(Boolean(activeItem));
  }, [activeId, data, onClick]);

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
        <ClusterPointIcon
          onClick={() => onClick?.(data)}
          className={clsx(
            'bg-brand-primary border border-brand-primary/[0.2] text-2xl text-white',
            isActive && 'bg-brand-highlight text-white'
          )}
        />
      )}
    </>
  );
}
