// 异步加载Map组件
'use client';
import dynamic from 'next/dynamic';

export const Map = dynamic(() => import('./Map'), {
  ssr: false
});
