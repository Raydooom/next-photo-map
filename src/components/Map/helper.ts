import { PhotoLocation, MarkerPoint } from '@/types';

// 声明类型，防止 TS 报错
declare const window: any;

/**
 * 动态获取自定义覆盖物类
 */
export const getLucideOverlayClass = () => {
  if (typeof window === 'undefined' || !window.BMapGL) {
    return null;
  }

  return class LucideOverlay extends window.BMapGL.Overlay {
    private _point: any;
    private _div: HTMLElement | null = null;
    private _size: number;
    private _htmlString: string;
    private _fixOffset: boolean;
    private _onClick: (e: MouseEvent) => void;

    constructor(point: any, htmlString: string, options: any = {}) {
      super();
      this._point = point;
      this._htmlString = htmlString;
      this._size = options?.size || 32;
      this._fixOffset = options?.fixOffset === false ? false : true; // 是否修正偏移量，默认 true
      this._onClick = options?.onClick || (() => {});
    }

    initialize(map: any) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.zIndex = window.BMapGL.Overlay.getZIndex(this._point.lat);
      div.innerHTML = this._htmlString;
      div.addEventListener('click', this._onClick);

      map.getPanes().markerPane.appendChild(div);
      this._div = div;
      return div;
    }

    draw() {
      const map = (this as any)._map;
      const pixel = map.pointToOverlayPixel(this._point);
      const left = this._fixOffset ? pixel.x - this._size / 2 : pixel.x;
      const top = this._fixOffset ? pixel.y - this._size / 2 : pixel.y;
      if (this._div) {
        this._div.style.left = `${left}px`;
        this._div.style.top = `${top}px`;
      }
    }

    destroy() {
      if (this._div) {
        this._div.removeEventListener('click', this._onClick);
        this._div.parentNode?.removeChild(this._div);
        this._div = null;
      }
    }
  };
};

export interface GroupedLocation {
  point: MarkerPoint;
  list: PhotoLocation[];
  count: number;
}
// 合并坐标
export const groupByLocation = (
  locationList: (PhotoLocation & {
    point: MarkerPoint;
  })[],
  precision = 2
) => {
  return locationList.reduce(
    (groups: Record<string, GroupedLocation>, location) => {
      // 创建一个唯一的网格 Key，例如 "31.23,121.47"
      const key = `${location.point.longitude.toFixed(precision)},${location.point.latitude.toFixed(precision)}`;

      if (!groups[key]) {
        groups[key] = {
          point: location.point,
          list: [],
          count: 0
        };
      }

      groups[key].list.push(location);
      groups[key].count++;
      return groups;
    },
    {}
  );
};
