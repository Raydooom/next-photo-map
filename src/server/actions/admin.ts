'use server';

import { ScannerService } from '../services/admin.services';
const scannerService = new ScannerService();

export const scanner = async () => {
  return await scannerService.startScanner();
};
