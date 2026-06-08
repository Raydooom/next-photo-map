'use client';
import maplibreGl from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapControls } from '@/components/Map/modules/MapControls';
import { BackIcon } from '@/components/Icons/custom';
import { PointDetail } from './PointDetail';
import { MapModeSwitch, type FootprintMode } from './MapModeSwitch';
import { replaceUrl } from '@/utils/url';
import { MapMarker } from '@/types/mapMarker';
import { ClusterMarker } from '@/components/Map/modules/ClusterMarker';
import { useMapBase, useMapClusters, useRegionLayer } from '@/components/Map';
import { bbox, featureCollection } from '@turf/turf';

interface MapProps {
  markerGroup?: MapMarker[];
  regionStats?: Record<string, { city: string; count: number }>;
  hideBackIcon?: boolean;
}

export default function Map({
  markerGroup,
  regionStats = {},
  hideBackIcon = false
}: MapProps) {
  // 使用 useMapLibre hook
  const { mapRef, mapInstance } = useMapBase({ config: { zoom: 6 } });
  const { clusters, updateMarkers } = useMapClusters(mapInstance!);

  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;

  const [mode, setMode] = useState<FootprintMode>('point');
  const [viewList, setViewList] = useState<MapMarker['list']>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  const isPointMode = mode === 'point';

  // 区域足迹图层（区域模式时绘制并高亮，支持点击弹窗）
  useRegionLayer(mapInstance, {
    enabled: !isPointMode,
    regionStats
  });

  useEffect(() => {
    if (window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  // 切换到区域模式时，关闭点位详情卡片
  useEffect(() => {
    if (!isPointMode) {
      setViewList([]);
    }
  }, [isPointMode]);

  // 根据url参数，居中显示地图（仅点位模式）
  useEffect(() => {
    if (!isPointMode) return;
    const viewPoint = markerGroup?.find((group) => {
      const viewPhoto = group.list.find(
        (location) => location.photoId === photoId
      );
      return viewPhoto;
    });

    if (viewPoint) {
      if (mapInstance) {
        mapInstance.flyTo({ center: viewPoint.point, zoom: 16 });
      }
      setViewList(viewPoint.list);
    }
  }, [mapInstance, markerGroup, photoId, isPointMode]);

  // 更新地图聚合数据（仅点位模式渲染聚合点）
  useEffect(() => {
    if (!mapInstance || !markerGroup) return;

    // 区域模式下清空聚合点
    if (!isPointMode) {
      updateMarkers([]);
      return;
    }

    // 转换数据为 GeoJSON 格式
    const features = markerGroup.map((group) => ({
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

    // 没有url参数，居中显示地图
    if (!photoId) {
      const collection = featureCollection(features);
      const bounds = bbox(collection);
      mapInstance.fitBounds(
        [
          [bounds[0], bounds[1]], // 西南角
          [bounds[2], bounds[3]] // 东北角
        ],
        { padding: { top: 60, bottom: 60, left: 60, right: 100 } }
      );
    }

    // 更新数据源
    updateMarkers(features);
  }, [mapInstance, markerGroup, updateMarkers, photoId, isPointMode]);

  // 添加点击事件监听
  const handleClusterClick = async (cluster: any) => {
    if (!mapInstance) return;
    const { id, coordinates, properties } = cluster;
    const source = mapInstance.getSource('markers') as maplibreGl.GeoJSONSource;

    if (properties.cluster) {
      // 点击聚合点，展开聚合

      const expansionZoom = await source.getClusterExpansionZoom(id);
      mapInstance.flyTo({
        center: coordinates,
        zoom: expansionZoom + 2,
        duration: 1000
      });
    } else {
      // 点击单点
      const data = JSON.parse(properties.data) as MapMarker;
      setViewList(data.list);
      replaceUrl(`${window.location.pathname}?photoId=${data.list[0].photoId}`);

      mapInstance.flyTo({
        center: data.point,
        duration: 1000
      });
    }
  };
  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      {canGoBack && !hideBackIcon && (
        <BackIcon className="absolute top-4 left-4 z-10" />
      )}

      {/* 模式切换：点位足迹 / 区域足迹 */}
      <MapModeSwitch
        mode={mode}
        onChange={setMode}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
      />

      <PointDetail
        onClose={() => {
          setViewList([]);
          replaceUrl(window.location.pathname);
        }}
        onBackLocation={(location: any) => {
          if (location) {
            mapInstance?.flyTo({
              center: location.point,
              duration: 400
            });
          }
        }}
        viewList={viewList}
      />

      <div ref={mapRef} className="w-full h-full relative overflow-hidden">
        {/* 渲染 React 聚合组件层（仅点位模式） */}
        {mapInstance &&
          isPointMode &&
          clusters.map((cluster) => (
            <ClusterMarker
              key={cluster.renderKey}
              map={mapInstance}
              cluster={cluster}
              onClick={handleClusterClick}
            />
          ))}
        {/* 使用 MapControls 组件 */}
        <MapControls mapInstance={mapInstance} />
      </div>
    </div>
  );
}
