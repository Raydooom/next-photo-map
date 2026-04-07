'use server';

import { ScannerService } from '../services/admin.services';
const scannerService = new ScannerService();

export const scanner = async (force: boolean = false) => {
  return await scannerService.startScanner(force);
};
