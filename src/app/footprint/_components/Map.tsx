'use client';
import maplibreGl from 'maplibre-gl';
import { useEffect, useState, useMemo } from 'react';
import { useMapLibre } from '@/components/Map/hooks';
import { MapControls } from '@/components/Map/modules/MapControls';
import { BackIcon } from '@/components/Icons/custom';
import { useSearchParams } from 'next/navigation';
import { PointDetail } from './PointDetail';
import { replaceUrl } from '@/utils/url';
import { MapMarker } from '@/types/mapMarker';
import { ClusterMarker } from '@/components/Map/modules/ClusterMarker';

interface MapProps {
  markerGroup?: MapMarker[];
  hideBackIcon?: boolean;
}

export default function Map({ markerGroup, hideBackIcon = false }: MapProps) {
  // 使用 useMapLibre hook
  const {
    mapRef,
    mapInstance,
    clusters,
    setCenterAndZoom,
    flyTo,
    updateMarkers
  } = useMapLibre({
    config: useMemo(
      () => ({
        cluster: true,
        clusterMaxZoom: 17,
        clusterRadius: 50
      }),
      []
    )
  });

  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;
  const [activeId, setActiveId] = useState<number | undefined>(undefined);

  const [viewList, setViewList] = useState<MapMarker['list']>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  // 根据url参数，居中显示地图
  useEffect(() => {
    const viewPoint = markerGroup?.find(group => {
      const viewPhoto = group.list.find(photo => photo.id === photoId);
      viewPhoto && setActiveId(viewPhoto.id);
      return viewPhoto;
    });

    if (viewPoint) {
      if (mapInstance) {
        setCenterAndZoom(viewPoint.point, 16);
      }
      setViewList(viewPoint.list);
    }
  }, [mapInstance, markerGroup, photoId]);

  // 更新地图数据
  useEffect(() => {
    if (!mapInstance || !markerGroup) return;

    // 转换数据为 GeoJSON 格式
    const features = markerGroup.map(group => ({
      type: 'Feature' as const,
      properties: {
        data: group,
        count: group.list.length
      },
      geometry: {
        type: 'Point' as const,
        coordinates: group.point
      }
    }));

    // 更新数据源
    updateMarkers(features);
  }, [mapInstance, markerGroup, updateMarkers]);

  // 添加点击事件监听
  const handleClusterClick = async (cluster: any) => {
    if (!mapInstance) return;
    const { id, coordinates, properties } = cluster;
    const source = mapInstance.getSource('markers') as maplibreGl.GeoJSONSource;

    const expansionZoom = await source.getClusterExpansionZoom(id);
    if (properties.cluster) {
      // 点击聚合点，展开聚合
      flyTo(coordinates, {
        zoom: expansionZoom + 1
      });
    } else {
      // 点击单点
      const data = JSON.parse(properties.data) as MapMarker;
      setViewList(data.list);
      setActiveId(undefined);
      replaceUrl(`${window.location.pathname}?photoId=${data.list[0].id}`);
      flyTo(data.point, {
        zoom: expansionZoom + 1
      });
    }
  };
  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      {canGoBack && !hideBackIcon && (
        <BackIcon className="absolute top-4 left-4 z-10" />
      )}

      <PointDetail
        onClose={() => {
          setViewList([]);
          setActiveId(undefined);
          replaceUrl(window.location.pathname);
        }}
        onBackLocation={(location: any) => {
          if (location) {
            flyTo(location.bPoint);
          }
        }}
        viewList={viewList}
      />

      <div ref={mapRef} className="w-full h-full relative overflow-hidden">
        {/* 渲染 React 聚合组件层 */}
        {mapInstance &&
          clusters.map(cluster => {
            return (
              <ClusterMarker
                key={cluster.renderKey}
                map={mapInstance}
                cluster={cluster}
                onClick={handleClusterClick}
              />
            );
          })}
        {/* 使用 MapControls 组件 */}
        <MapControls mapInstance={mapInstance} />
      </div>
    </div>
  );
}
