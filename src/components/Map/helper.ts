import { ExifData } from '@/types';

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

/**
 * 坐标转换工具
 * 适用场景：将照片原始 EXIF 坐标转换为百度地图坐标
 */
export const coordTransform = {
  // 定义常量
  X_PI: (3.14159265358979324 * 3000.0) / 180.0,
  PI: 3.1415926535897932384626,
  A: 6378245.0,
  EE: 0.00669342162296594323,

  // 辅助方法：将 EXIF 的 [度, 分, 秒] 转换为十进制
  exifToDecimal: (data: number[]): number => {
    return data[0] + data[1] / 60 + data[2] / 3600;
  },

  // WGS-84 转 GCJ-02 (火星坐标系)
  wgs84togcj02: function (lng: number, lat: number): number[] {
    let dlat = this.transformlat(lng - 105.0, lat - 35.0);
    let dlng = this.transformlng(lng - 105.0, lat - 35.0);
    let radlat = (lat / 180.0) * this.PI;
    let magic = Math.sin(radlat);
    magic = 1 - this.EE * magic * magic;
    let sqrtmagic = Math.sqrt(magic);
    dlat =
      (dlat * 180.0) /
      (((this.A * (1 - this.EE)) / (magic * sqrtmagic)) * this.PI);
    dlng = (dlng * 180.0) / ((this.A / sqrtmagic) * Math.cos(radlat) * this.PI);
    return [lng + dlng, lat + dlat];
  },

  // GCJ-02 转 BD-09 (百度坐标系)
  gcj02tobd09: function ({ lng, lat }: { lng: number; lat: number }): {
    lng: number;
    lat: number;
  } {
    let z =
      Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * this.X_PI);
    let theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * this.X_PI);
    let bd_lng = z * Math.cos(theta) + 0.0065;
    let bd_lat = z * Math.sin(theta) + 0.006;
    return { lng: bd_lng, lat: bd_lat };
  },

  // 核心计算偏移量的方法
  transformlat: function (lng: number, lat: number): number {
    let ret =
      -100.0 +
      2.0 * lng +
      3.0 * lat +
      0.2 * lat * lat +
      0.1 * lng * lat +
      0.2 * Math.sqrt(Math.abs(lng));
    ret +=
      ((20.0 * Math.sin(6.0 * lng * this.PI) +
        20.0 * Math.sin(2.0 * lng * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(lat * this.PI) +
        40.0 * Math.sin((lat / 3.0) * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((160.0 * Math.sin((lat / 12.0) * this.PI) +
        320 * Math.sin((lat * this.PI) / 30.0)) *
        2.0) /
      3.0;
    return ret;
  },

  transformlng: function (lng: number, lat: number): number {
    let ret =
      300.0 +
      lng +
      2.0 * lat +
      0.1 * lng * lng +
      0.1 * lng * lat +
      0.1 * Math.sqrt(Math.abs(lng));
    ret +=
      ((20.0 * Math.sin(6.0 * lng * this.PI) +
        20.0 * Math.sin(2.0 * lng * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((20.0 * Math.sin(lng * this.PI) +
        40.0 * Math.sin((lng / 3.0) * this.PI)) *
        2.0) /
      3.0;
    ret +=
      ((150.0 * Math.sin((lng / 12.0) * this.PI) +
        300.0 * Math.sin((lng / 30.0) * this.PI)) *
        2.0) /
      3.0;
    return ret;
  },
  transformToBaidu: function ({ lng, lat }: { lng: number[]; lat: number[] }): {
    lng: number;
    lat: number;
  } {
    // 1. 数组转十进制
    const lngWGS = this.exifToDecimal(lng);
    const latWGS = this.exifToDecimal(lat);
    const gcj = this.wgs84togcj02(lngWGS, latWGS);
    return this.gcj02tobd09({ lng: gcj[0], lat: gcj[1] });
  }
};

// 合并坐标
export const groupByLocation = (
  exifDataList: (ExifData & { point: number[] })[],
  precision = 2
) => {
  return exifDataList.reduce((groups: Record<string, any>, exifData) => {
    // 创建一个唯一的网格 Key，例如 "31.23,121.47"
    const key = `${exifData.point[0]?.toFixed(precision)},${exifData.point[1]?.toFixed(precision)}`;

    if (!groups[key]) {
      groups[key] = {
        id: exifData.id,
        point: key.split(',').map(Number),
        list: [],
        count: 0
      };
    }

    groups[key].list.push(exifData);
    groups[key].count++;
    return groups;
  }, {});
};
