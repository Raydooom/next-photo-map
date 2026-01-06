'use client';
import React from 'react';
import { Root, createRoot } from 'react-dom/client';

export class ReactOverlay {
  private _point: any;
  private _element: HTMLDivElement | null = null;
  private _map: any = null;
  private _root: Root | null = null;
  private _component: React.ReactNode;

  constructor(point: any, component: React.ReactNode) {
    // 只有在浏览器环境下才绑定原型
    if (typeof window !== 'undefined' && window.BMapGL) {
      Object.setPrototypeOf(this, window.BMapGL.Overlay.prototype);
    }
    this._point = point;
    this._component = component;
  }

  // 必须是同步执行 initialize，但渲染可以是异步或由外部驱动
  initialize(map: any): HTMLElement {
    this._map = map;
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.zIndex = '1000';

    this._element = div;
    map.getPanes().markerPane.appendChild(div);

    // 延迟或动态加载 React 渲染逻辑
    this.renderReactContent(div);

    return div;
  }

  renderReactContent(container: HTMLElement) {
    if (typeof window === 'undefined') return;

    // 【核心修复】动态导入，确保这段代码永远不会在服务端运行

    if (!this._root) {
      this._root = createRoot(container);
    }
    this._root.render(this._component);
  }

  draw(): void {
    if (!this._map || !this._element) return;
    const pixel = this._map.pointToOverlayPixel(this._point);
    this._element.style.left = `${pixel.x}px`;
    this._element.style.top = `${pixel.y}px`;
  }

  onRemove(): void {
    // 卸载 React 节点
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }
  }
}
