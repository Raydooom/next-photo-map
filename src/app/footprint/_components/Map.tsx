'use client';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useBaiduMap } from '@/components/Map';
import ClusterPoint, {
  ClusterPointData
} from '@/components/Map/modules/ClusterPoint';
import { BackIcon } from '@/components/Icons/custom';
import { useSearchParams } from 'next/navigation';
import { MapControls } from './MapControls';
import { PhotoLocation } from '@/types';
import { PointDetail } from './PointDetail';
import { replaceUrl } from '@/utils/history';

type MapMarker = {
  bPoint: { lng: number; lat: number };
  count?: number;
  list: PhotoLocation[];
};
interface MapProps {
  markerGroup?: MapMarker[];
}

export default function Map({ markerGroup }: MapProps) {
  const { mapRef, mapInstance, isInitialized, setCenterAndZoom, flyTo } =
    useBaiduMap();

  const searchParams = useSearchParams();
  const photoId = Number(searchParams.get('photoId')) || undefined;
  const [activeId, setActiveId] = useState<number | undefined>(undefined);

  const [viewList, setViewList] = useState<PhotoLocation[]>([]);

  // 根据url参数，居中显示地图
  useEffect(() => {
    const viewPoint = markerGroup?.find(group => {
      const viewPhoto = group.list.find(photo => photo.id === photoId);
      viewPhoto && setActiveId(viewPhoto.id);
      return viewPhoto;
    });

    if (viewPoint) {
      if (mapInstance && isInitialized) {
        setCenterAndZoom(viewPoint.bPoint, 18);
      }
      setViewList(viewPoint.list);
    } else {
      setCenterAndZoom(new window.BMapGL.Point(116.404, 39.915), 12);
    }
  }, [mapInstance, isInitialized, markerGroup, photoId]);

  // 点击聚合点，居中显示地图
  const onClickPoint = (clusterData: ClusterPointData['data']) => {
    setViewList(clusterData.list);
    flyTo(clusterData.bPoint);
    // 如果一个点位包含多个图片，将第一个图片的id设为激活状态
    setActiveId(clusterData.list[0].id);
    // // 仅更新地址栏 URL，不触发 Next.js 的路由跳转逻辑
    replaceUrl(`${window.location.pathname}?photoId=${clusterData.list[0].id}`);
  };
  const onCloseDetail = () => {
    setViewList([]);
    setActiveId(undefined);
    replaceUrl(window.location.pathname);
  };
  // 绘制聚合点
  useEffect(() => {
    if (!mapInstance || !markerGroup) return;
    const Cluster = window.Cluster;
    const getHtmlDom = (cluster: ClusterPointData) => {
      const div = document.createElement('div');
      const root = createRoot(div);
      root.render(
        <ClusterPoint
          activeId={Number(activeId)}
          data={cluster}
          onClick={onClickPoint}
        />
      );
      return div;
    };

    const cluster = new Cluster.View(mapInstance, {
      clusterMinPoints: 2,
      clusterMaxZoom: 18,
      updateRealTime: true,
      fitViewOnClick: true,
      renderClusterStyle: {
        type: Cluster.ClusterRender.DOM,
        inject: getHtmlDom
      },
      renderSingleStyle: {
        type: Cluster.ClusterRender.DOM,
        inject: getHtmlDom
      }
    });

    const points = Cluster.pointTransformer(
      markerGroup,
      function (data: MapMarker) {
        return {
          point: [data.bPoint.lng, data.bPoint.lat],
          properties: {
            data
          }
        };
      }
    );
    cluster.setData(points);
    return () => {
      // 检查你的插件文档，通常是以下两种方法之一：
      if (cluster.destroy) {
        cluster.destroy(); // 销毁实例并移除 DOM
      } else if (cluster.clear) {
        cluster.clear(); // 清除数据和图层
      }
      // 确保清空地图上的相关 Overlay
      mapInstance.clearOverlays();
    };
  }, [mapInstance, markerGroup]);

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      <BackIcon className="absolute top-4 left-4 z-10" />
      <PointDetail onClose={onCloseDetail} viewList={viewList} />
      <div ref={mapRef} className="w-full h-full" />
      <MapControls mapInstance={mapInstance} />
    </div>
  );
}
