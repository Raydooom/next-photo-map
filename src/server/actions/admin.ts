'use server';

import { revalidatePath } from 'next/cache';
import { ScannerService } from '../services/admin.services';
import { siteConfig } from '../../config/site';
const scannerService = new ScannerService();

// 需要更新静态页面的路径
const refreshPaths = siteConfig.navItems
  .filter(item => item.meta.needRefresh)
  .map(item => item.href);

export const scanner = async (force: boolean = false) => {
  const result = await scannerService.startScanner(force);
  // 更新静态页面缓存数据
  for (const path of refreshPaths) {
    revalidatePath(path);
  }
  return result;
};
