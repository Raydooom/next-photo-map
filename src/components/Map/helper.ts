// src/components/Map/helper.ts

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
    private _color: string;
    private _size: number;
    private _svgString: string;

    constructor(point: any, svgString: string, options: any = {}) {
      super();
      this._point = point;
      this._svgString = svgString;
      this._color = options.color || '#3b82f6';
      this._size = options.size || 32;
    }

    initialize(map: any) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.zIndex = window.BMapGL.Overlay.getZIndex(this._point.lat);
      div.innerHTML = this._svgString;

      map.getPanes().markerPane.appendChild(div);
      this._div = div;
      return div;
    }

    draw() {
      const map = (this as any)._map;
      const pixel = map.pointToOverlayPixel(this._point);
      if (this._div) {
        this._div.style.left = `${pixel.x - this._size / 2}px`;
        this._div.style.top = `${pixel.y - this._size / 2}px`;
      }
    }
  };
};
