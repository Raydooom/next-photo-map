'use client';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useBaiduMap } from '@/components/Map';
import ClusterPoint, {
  ClusterPointData
} from '@/components/Map/modules/ClusterPoint';
import { BackIcon } from '@/components/Icons/custom';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapControls } from './MapControls';
import { ExifData } from '@/types';
import { PointDetail } from './PointDetail';

interface MapProps {
  markerGroup?: {
    point: [number, number];
    count?: number;
    id: number;
    list: ExifData[];
  }[];
}

export default function Map({ markerGroup }: MapProps) {
  const router = useRouter();

  const { mapRef, isLoadingTiles, mapInstance, centerAndZoom, flyTo } =
    useBaiduMap({
      center: { lng: 116.404, lat: 39.915 },
      config: { zoom: 11 },
      events: {
        onMapLoad: map => {
          console.log(map);
        }
      }
    });

  const searchParams = useSearchParams();
  const extendId = searchParams.get('id') || undefined;
  const [activeId, setActiveId] = useState<number | undefined>(undefined);

  const [viewList, setViewList] = useState<ExifData[]>([]);

  // 根据url参数，居中显示地图
  useEffect(() => {
    // if (!mapInstance) return;
    const viewMarker = markerGroup?.find(item => item.id === Number(extendId));
    if (viewMarker) {
      setTimeout(() => {
        centerAndZoom(viewMarker.point, 18);
      }, 300);
      setActiveId(viewMarker.id);
      setViewList(viewMarker.list);
    }
  }, [mapInstance, markerGroup]);

  // 点击聚合点，居中显示地图
  const onClickPoint = (clusterData: ClusterPointData['data']) => {
    setViewList(clusterData.list);
    flyTo(clusterData.point, [-300, 0]);
    // 仅更新地址栏 URL，不触发 Next.js 的路由跳转逻辑
    const newUrl = `${window.location.pathname}?id=${clusterData.id}`;
    window.history.replaceState(
      { ...window.history.state, as: newUrl, url: newUrl },
      '',
      newUrl
    );
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

    var points = Cluster.pointTransformer(markerGroup, function (data: any) {
      return {
        point: data.point,
        properties: {
          data
        }
      };
    });
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
  }, [mapInstance, markerGroup, activeId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <BackIcon className="absolute top-4 left-4 z-10" />
      <PointDetail viewList={viewList} />
      <div ref={mapRef} className="w-full h-full" />
      <MapControls mapInstance={mapInstance} />
    </div>
  );
}
