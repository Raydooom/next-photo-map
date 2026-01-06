'use client';
import { useBaiduMap } from '@/components/Map';
import { useEffect } from 'react';
import ClusterPoint from '@/components/Map/modules/ClusterPoint';

interface MapProps {
  markerGroup?: {
    point: [number, number];
    count?: number;
    coverUrl?: string;
    [key: string]: any;
  }[];
}

export default function Map({ markerGroup }: MapProps) {
  const { mapRef, mapInstance } = useBaiduMap({
    center: { lng: 116.404, lat: 39.915 },
    config: { zoom: 11 }
  });

  useEffect(() => {
    if (!mapInstance || !markerGroup) return;
    const Cluster = window.Cluster;

    const getHtmlDom = (cluster: any) => {
      const div = document.createElement('div');
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(div);
        root.render(<ClusterPoint data={cluster} />);
      });
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
          ...data
        }
      };
    });
    cluster.setData(points);
  }, [mapInstance, markerGroup]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
