'use client';
import maplibregl from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { useMapLibre } from '@/components/Map/hooks';
import { MapControls } from '@/components/Map/MapControls';
import { BackIcon } from '@/components/Icons/custom';
import { useSearchParams } from 'next/navigation';
import { PointDetail } from './PointDetail';
import { replaceUrl } from '@/utils/url';
import { MapMarker } from '@/types/mapMarker';

interface MapProps {
  markerGroup?: MapMarker[];
  hideBackIcon?: boolean;
}

export default function Map({ markerGroup, hideBackIcon = false }: MapProps) {
  // 使用 useMapLibre hook
  const {
    mapRef,
    mapInstance,
    isInitialized,
    setCenterAndZoom,
    flyTo,
    updateMarkers
  } = useMapLibre({
    config: {
      cluster: true,
      clusterMaxZoom: 17,
      clusterRadius: 50
    }
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
      if (mapInstance && isInitialized) {
        setCenterAndZoom(viewPoint.point, 16);
      }
      setViewList(viewPoint.list);
    } else {
      if (mapInstance && isInitialized) {
        setCenterAndZoom({ longitude: 116.404, latitude: 39.915 }, 12);
      }
    }
  }, [mapInstance, isInitialized, markerGroup, photoId]);

  // 更新地图数据
  useEffect(() => {
    if (!mapInstance || !markerGroup || !isInitialized) return;

    // 转换数据为 GeoJSON 格式
    const features = markerGroup.map(group => ({
      type: 'Feature' as const,
      properties: {
        data: group,
        count: group.list.length
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [group.point.longitude, group.point.latitude]
      }
    }));

    // 更新数据源
    updateMarkers(features);

    // 添加点击事件监听
    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      if (features.length) {
        const clusterId = features[0].properties?.cluster_id;

        if (clusterId !== undefined) {
          // 点击聚合点，展开聚合
          const source = mapInstance.getSource(
            'markers'
          ) as maplibregl.GeoJSONSource;

          console.log('👾 ~ :104 ~ handleClick ~ sourcelog:', source);

          const expansionZoom = await source.getClusterExpansionZoom(clusterId);
          const coordinates = (features[0].geometry as any).coordinates;
          mapInstance.flyTo({
            center: coordinates, // 飞向聚合点的中心
            zoom: expansionZoom + 1, // 稍微多加一点
            speed: 1.2, // 飞行动画的速度
            curve: 1.42, // 飞行曲线，数值越大，动画看起来越“高”
            essential: true // 哪怕用户开启了“减弱动画”设置，这个飞行也会执行
          });
        }
      } else {
        // 点击单个标记点
        const singleFeatures = mapInstance.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point']
        });
        if (singleFeatures.length) {
          const feature = singleFeatures[0];
          const data = feature.properties?.data;
          const formattedData = JSON.parse(data as string);
          if (formattedData) {
            setViewList(formattedData.list);
            flyTo(formattedData.point);
            setActiveId(formattedData.list[0].id);
            replaceUrl(
              `${window.location.pathname}?photoId=${formattedData.list[0].id}`
            );
          }
        }
      }
    };

    mapInstance.on('click', handleClick);

    return () => {
      mapInstance.off('click', handleClick);
    };
  }, [mapInstance, markerGroup, isInitialized, updateMarkers, flyTo]);

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
      <div ref={mapRef} className="w-full h-full" />

      {/* 使用 MapControls 组件 */}
      <MapControls mapInstance={mapInstance} />
    </div>
  );
}
