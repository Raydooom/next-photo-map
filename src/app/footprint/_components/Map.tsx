'use client';

import maplibreGl from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bbox, featureCollection } from '@turf/turf';

import { MapControls } from '@/components/Map/modules/MapControls';
import { ClusterMarker } from '@/components/Map/modules/ClusterMarker';
import { useMapBase, useMapClusters, useRegionLayer } from '@/components/Map';
import { TraceViewer } from './TraceViewer';
import { MapMarker } from '@/types/mapMarker';
import { PhotoItem } from '@/types';
import * as Actions from '@/server/actions/index';
import { readUrlParam, removeUrlParam, setUrlParam } from '@/utils/url';
import type { CityIndexItem } from '../page';
import { TraceSidebar } from './TraceSidebar';
import {
  DEFAULT_LAYER_VISIBILITY,
  resolveLayerGroup,
  type LayerGroupKey,
  type LayerVisibility
} from './layerGroups';
import { ViewSwitch, type FootprintView } from './ViewSwitch';

/** 站点导航栏高度，页面据此撑满余下的视口 */
const NAVBAR_HEIGHT = '60px';

/** 全览取景的留白 */
const FIT_PADDING = { top: 64, bottom: 64, left: 64, right: 64 };

/** 点击城市后的目标缩放级别 */
const CITY_ZOOM = 9;

interface MapProps {
  markerGroup?: MapMarker[];
  regionStats?: Record<string, { city: string; count: number }>;
  cityIndex?: CityIndexItem[];
  stats?: { points: number; cities: number; provinces: number };
}

export default function Map({
  markerGroup = [],
  regionStats = {},
  cityIndex = [],
  stats = { points: 0, cities: 0, provinces: 0 }
}: MapProps) {
  const { mapRef, mapInstance } = useMapBase({ config: { zoom: 6 } });
  const { clusters, updateMarkers } = useMapClusters(mapInstance!);

  /**
   * 当前视图。两者互斥：点位看"具体在哪拍的"，区县看"走遍了哪些地方"。
   * 默认点位 —— 照片是这一页的主体，区县是它的概览。
   */
  const [view, setView] = useState<FootprintView>('points');
  const isRegionView = view === 'regions';

  /** 底图内容的分组开关，初值等同于未加开关时的观感 */
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(
    DEFAULT_LAYER_VISIBILITY
  );

  const toggleLayer = useCallback((key: LayerGroupKey, value: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [key]: value }));
  }, []);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  /**
   * 查看器的照片列表。
   * 点击标记时按需取详情 —— 地图页只拿到了点位数据（经纬度与行政区），
   * 照片本身的尺寸、EXIF、缩略图都要另外查。
   */
  const [viewerPhotos, setViewerPhotos] = useState<PhotoItem[]>([]);
  const [viewerId, setViewerId] = useState<number | undefined>(undefined);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  /**
   * 停留本页期间锁住文档滚动。
   *
   * 本页按视口取景，本不该有页面级滚动，但全局 LayoutWrapper 用
   * min-h-screen（100vh）撑最小高度，而本页高度按 100dvh 计算 ——
   * 移动端地址栏可见时 100dvh 小于 100vh，多出的一截就成了可滚动区域。
   *
   * 只在本页生效、离开时原样还原，不去改全局布局，免得波及其他页面。
   * 只碰 documentElement：查看器的滚动锁操作 body，两边不交叠。
   */
  useEffect(() => {
    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previousOverflow;
    };
  }, []);

  // 区县轮廓作为可叠加的图层，与点位共存
  // fitBounds 关掉：切换视图只该换掉看的内容，不该把人的取景位置弄丢
  useRegionLayer(mapInstance, {
    enabled: isRegionView,
    regionStats,
    fitBounds: false
  });

  /**
   * 按侧栏开关施加底图内容的可见性。
   *
   * 只动归入分组的图层，其余（建筑、绿地、水面、行政边界）保持底图原样 ——
   * 那些是地图的基本面貌，不该被开关波及。
   *
   * 两个方向都显式写 visible/none：样式重载后默认可见，
   * 只设 none 会让状态随重载次数漂移。
   * 主题切换会重建样式，故 style.load 后需重新施加。
   */
  useEffect(() => {
    if (!mapInstance) return;

    const applyLayerVisibility = () => {
      const style = mapInstance.getStyle();
      if (!style?.layers) return;

      style.layers.forEach((layer) => {
        const sourceLayer =
          'source-layer' in layer ? layer['source-layer'] : undefined;
        const group = resolveLayerGroup(layer.type, sourceLayer);
        if (!group) return;

        mapInstance.setLayoutProperty(
          layer.id,
          'visibility',
          layerVisibility[group] ? 'visible' : 'none'
        );
      });
    };

    applyLayerVisibility();
    mapInstance.on('style.load', applyLayerVisibility);

    return () => {
      mapInstance.off('style.load', applyLayerVisibility);
    };
  }, [mapInstance, layerVisibility]);

  const features = useMemo(
    () =>
      markerGroup.map((group) => ({
        type: 'Feature' as const,
        properties: {
          data: group,
          count: group.list.length
        },
        geometry: {
          type: 'Point' as const,
          coordinates: group.point
        }
      })),
    [markerGroup]
  );

  // 全览取景：只在首次数据就绪时做一次，之后交给用户与城市索引控制视野
  const [hasFitted, setHasFitted] = useState(false);

  useEffect(() => {
    if (!mapInstance || features.length === 0) return;

    updateMarkers(features);

    if (hasFitted) return;

    const bounds = bbox(featureCollection(features));
    mapInstance.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]]
      ],
      { padding: FIT_PADDING }
    );
    setHasFitted(true);
  }, [mapInstance, features, updateMarkers, hasFitted]);

  const selectCity = useCallback(
    (city: string | null) => {
      setActiveCity(city);
      if (!mapInstance) return;

      if (!city) {
        if (features.length === 0) return;
        const bounds = bbox(featureCollection(features));
        mapInstance.fitBounds(
          [
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
          ],
          { padding: FIT_PADDING }
        );
        return;
      }

      const target = cityIndex.find((item) => item.city === city);
      if (target) {
        mapInstance.flyTo({
          center: target.center,
          zoom: CITY_ZOOM,
          duration: 900
        });
      }
    },
    [mapInstance, cityIndex, features]
  );

  /**
   * 已取过的点位详情，按点位的照片 id 组合缓存。
   *
   * 首屏的位置数据只带了缩略图与尺寸，曝光参数、器材、拍摄时间都得点开时再取，
   * 这一次往返省不掉；但同一个点位被反复点开时没必要重复请求 —— 点位数据来自
   * 首屏，在页面生命周期内不会变，取回的详情可以一直用。
   *
   * 放在 ref 里而不是 state：它只是请求的旁路记录，写入不该触发渲染。
   * 容器用普通对象而非 Map —— 本模块的默认导出名为 Map，会遮蔽全局构造器。
   */
  const detailCacheRef = useRef<Record<string, PhotoItem[]>>({});

  /** 取该点位的照片详情，打开全屏查看器 */
  const openViewer = useCallback(
    async (group: MapMarker, preferredId?: number) => {
      const photoIds = group.list.map((item) => item.photoId);
      if (photoIds.length === 0) return;

      const cacheKey = photoIds.join(',');
      let detail = detailCacheRef.current[cacheKey];

      if (!detail) {
        const fetched = (await Actions.getPhotoDetailBatch(
          photoIds
        )) as PhotoItem[];
        // 失败或空结果不写缓存，留给下次点击重试
        if (!fetched || fetched.length === 0) return;
        detail = fetched;
        detailCacheRef.current[cacheKey] = fetched;
      }

      const targetId = preferredId ?? detail[0].id;
      setViewerPhotos(detail);
      setViewerId(targetId);
      setIsViewerOpen(true);
      setUrlParam('photoId', String(targetId));
    },
    []
  );

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    setViewerId(undefined);
    removeUrlParam('photoId');
  }, []);

  /**
   * 查看器翻页时同步地址栏。
   *
   * isOpen 为假时直接跳过：查看器有退场动画，那期间组件仍然挂载，
   * 任何迟到的回调都不该把刚清掉的 photoId 写回去。
   *
   * 比对的是浏览器真实 URL 而非 useSearchParams —— 地址栏由
   * history.replaceState 改写，useSearchParams 不会跟着重新求值。
   */
  const handleViewerSelect = useCallback(
    (item: PhotoItem) => {
      if (!isViewerOpen) return;
      if (readUrlParam('photoId') !== String(item.id)) {
        setUrlParam('photoId', String(item.id));
      }
    },
    [isViewerOpen]
  );

  /**
   * 进入页面时若地址栏带着 photoId，飞到该点位并打开查看器。
   * 只跑一次 —— 之后 photoId 的变化都由查看器翻页时自己写入，
   * 若继续跟随会与用户的操作互相打断。
   */
  const [hasAppliedUrlPhotoId, setHasAppliedUrlPhotoId] = useState(false);

  useEffect(() => {
    if (!mapInstance || markerGroup.length === 0 || hasAppliedUrlPhotoId)
      return;

    setHasAppliedUrlPhotoId(true);

    const photoId = Number(readUrlParam('photoId')) || undefined;
    if (!photoId) return;

    const target = markerGroup.find((group) =>
      group.list.some((location) => location.photoId === photoId)
    );
    if (!target) return;

    mapInstance.flyTo({ center: target.point, zoom: 16 });
    void openViewer(target, photoId);
  }, [mapInstance, markerGroup, hasAppliedUrlPhotoId, openViewer]);

  /**
   * 点击标记。
   * 聚合点先展开一级，落到具体点位后直接开查看器 ——
   * 观者点标记的意图就是看照片，中间再插一张信息卡是多余的一步。
   */
  const handleClusterClick = useCallback(
    async (cluster: any) => {
      if (!mapInstance) return;

      const { id, coordinates, properties } = cluster;

      if (properties.cluster) {
        const source = mapInstance.getSource(
          'markers'
        ) as maplibreGl.GeoJSONSource;
        const expansionZoom = await source.getClusterExpansionZoom(id);
        mapInstance.flyTo({
          center: coordinates,
          zoom: expansionZoom + 2,
          duration: 800
        });
        return;
      }

      // 具体点位不动相机：查看器会盖住整屏，居中这步观者看不见，
      // 却在关闭后留下一张被悄悄推走的地图，得重新找回原来的位置。
      const group = JSON.parse(properties.data) as MapMarker;
      await openViewer(group);
    },
    [mapInstance, openViewer]
  );

  return (
    <div
      // overflow-hidden：本页按视口取景，任何内部溢出都该由各区自己滚动，
      // 不该把整页撑高多出一条页面级滚动条
      className="relative flex w-full flex-col overflow-hidden wide:flex-row"
      style={{ height: `calc(100dvh - ${NAVBAR_HEIGHT})` }}
    >
      {/* 地图占主体，侧栏在右：视线从左上进入先落在内容上，工具退居其后 */}
      <div className="relative min-h-0 flex-1">
        <div ref={mapRef} className="h-full w-full overflow-hidden">
          {/* 区县视图下不挂点标记：色块与点争同一片注意力，两者只留一样 */}
          {mapInstance &&
            !isRegionView &&
            clusters.map((cluster, index) => (
              <ClusterMarker
                key={cluster.renderKey}
                map={mapInstance}
                cluster={cluster}
                // 序号只用来错开进场，顺序随视野变化亦无妨
                index={index}
                onClick={handleClusterClick}
              />
            ))}
        </div>

        <ViewSwitch
          value={view}
          onChange={setView}
          className="absolute bottom-5 left-5 z-10"
        />

        <MapControls
          mapInstance={mapInstance}
          className="absolute bottom-5 right-5 z-10"
        />
      </div>

      {/* 侧栏：宽屏靠右竖排，紧凑布局下退到地图下方横铺 */}
      <div className="h-[42dvh] shrink-0 wide:h-full wide:w-[300px]">
        <TraceSidebar
          stats={stats}
          cityIndex={cityIndex}
          activeCity={activeCity}
          onSelectCity={selectCity}
          layerVisibility={layerVisibility}
          onToggleLayer={toggleLayer}
        />
      </div>

      <TraceViewer
        photos={viewerPhotos}
        currentId={viewerId}
        isOpen={isViewerOpen}
        onClose={closeViewer}
        onSelect={handleViewerSelect}
      />
    </div>
  );
}
