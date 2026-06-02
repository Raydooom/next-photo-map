'use client';

import { useScan } from './_hooks/useScan';
import { DiscoveryCard, ScanStats, ScanLogs } from './_components';

export default function ScanPage() {
  const {
    isScanning,
    isDiscovering,
    forceScan,
    currentScanMode,
    setForceScan,
    logs,
    stats,
    discoveryInfo,
    startScan,
    stopScan,
    discoverPhotos
  } = useScan();

  const hasNewPhotos = (discoveryInfo?.newCount ?? 0) > 0;

  return (
    <div className="h-[calc(100vh-80px)] flex gap-4 overflow-hidden">
      {/* 左侧：照片发现和扫描统计 */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-3">
        <DiscoveryCard
          isDiscovering={isDiscovering}
          discoveryInfo={discoveryInfo}
          onRefresh={discoverPhotos}
        />
        <ScanStats
          isScanning={isScanning}
          isForceScan={currentScanMode === 'full'}
          stats={stats}
        />
      </div>

      {/* 右侧：扫描日志（包含控制按钮） */}
      <div className="flex-1 flex flex-col min-w-0">
        <ScanLogs
          logs={logs}
          isScanning={isScanning}
          forceScan={forceScan}
          onForceScanChange={setForceScan}
          onStart={startScan}
          onStop={stopScan}
          hasNewPhotos={hasNewPhotos}
        />
      </div>
    </div>
  );
}
