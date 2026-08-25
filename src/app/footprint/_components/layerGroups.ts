/**
 * 底图内容的分组开关定义。
 *
 * 底图本身有九十来个图层，直接暴露没有意义 —— 观者关心的是"看不看得见路"
 * 而不是 transportation 下那 49 个按等级拆开的线。这里按读图时的心智归成三组，
 * 每组对应一类肉眼可辨的内容。
 *
 * 单独成文件而非写在组件里：地图与侧栏都要用到，放任一侧都会让两个组件互相导入。
 */

/** 一组的匹配条件：图层类型与 source-layer 都命中才算属于本组 */
interface LayerGroup {
  /** 侧栏显示的名字 */
  label: string;
  /**
   * openmaptiles 的 source-layer。
   * 按它判别而非图层 id：id 由样式作者命名，换底图即失效，
   * source-layer 是 schema 字段，跨样式稳定。
   */
  sources: string[];
  /**
   * 限定图层类型。
   * 不能省 —— waterway 同时存在 symbol（河流名）与 line（河道本身），
   * 只按 source-layer 匹配的话，关掉地名会把河道一起抹去。
   */
  types: string[];
}

export const LAYER_GROUPS = {
  /** 行政地名与水体名：读图的锚点，没有它们一片轮廓无从辨认 */
  place: {
    label: '地名',
    sources: ['place', 'water_name', 'waterway'],
    types: ['symbol']
  },
  /** 路网线条，含铁路与机场跑道：辨认方位的骨架 */
  road: {
    label: '路网',
    sources: ['transportation', 'aeroway'],
    types: ['line']
  },
  /**
   * 街道尺度的文字：路名、门牌、POI。
   * 归成一组是因为它们同属放大后才出现的密集标注，
   * 平时开着只会把照片标记埋进字堆里。
   */
  street: {
    label: '街道标注',
    sources: ['transportation_name', 'housenumber', 'poi'],
    types: ['symbol']
  }
} satisfies Record<string, LayerGroup>;

export type LayerGroupKey = keyof typeof LAYER_GROUPS;

export type LayerVisibility = Record<LayerGroupKey, boolean>;

/**
 * 默认可见性，取值等同于未加开关时的观感：
 * 地名与路网可见，街道标注隐去。这样开关只是把既有状态显式化，
 * 不会因为引入控制而改变初次进入页面看到的地图。
 */
export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  place: true,
  road: true,
  street: false
};

/** 侧栏按此顺序排列开关：由粗到细，与缩放层级递进一致 */
export const LAYER_GROUP_ORDER: LayerGroupKey[] = ['place', 'road', 'street'];

/**
 * 判断某个图层归属哪一组，不属于任何组则返回 null（交由底图样式自己决定）。
 * 建筑、绿地、水面、行政边界都落在这里 —— 它们是底图的基本面貌，不做开关。
 */
export const resolveLayerGroup = (
  type: string,
  sourceLayer: string | undefined
): LayerGroupKey | null => {
  if (!sourceLayer) return null;

  const matched = LAYER_GROUP_ORDER.find((key) => {
    const group = LAYER_GROUPS[key];
    return group.types.includes(type) && group.sources.includes(sourceLayer);
  });

  return matched ?? null;
};
