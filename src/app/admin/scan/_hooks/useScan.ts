import { useState, useRef, useCallback, useEffect } from 'react';

interface ScanProgress {
  type: 'start' | 'progress' | 'complete' | 'error' | 'end';
  message: string;
  data?: any;
}

interface ScanStats {
  totalFiles: number;
  totalGroups: number;
  current: number;
  success: number;
  skipped: number;
  failed: number;
  duration?: string;
}

interface DiscoveryInfo {
  totalFiles: number;
  totalGroups: number;
  existingCount: number;
  newCount: number;
}

export function useScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [forceScan, setForceScan] = useState(false);
  const [currentScanMode, setCurrentScanMode] = useState<
    'full' | 'incremental'
  >('incremental');
  const [logs, setLogs] = useState<ScanProgress[]>([]);
  const [stats, setStats] = useState<ScanStats>({
    totalFiles: 0,
    totalGroups: 0,
    current: 0,
    success: 0,
    skipped: 0,
    failed: 0
  });
  const [discoveryInfo, setDiscoveryInfo] = useState<DiscoveryInfo | null>(
    null
  );

  const eventSourceRef = useRef<EventSource | null>(null);

  // 发现新照片（不实际扫描，只统计）
  const discoverPhotos = useCallback(async () => {
    setIsDiscovering(true);
    setDiscoveryInfo(null);

    try {
      const response = await fetch('/api/admin/scan/discover');
      const data = await response.json();

      if (data.success) {
        setDiscoveryInfo({
          totalFiles: data.totalFiles,
          totalGroups: data.totalGroups,
          existingCount: data.existingCount,
          newCount: data.newCount
        });
      }
    } catch (error) {
      console.error('发现照片失败:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  // 开始扫描
  const startScan = useCallback(() => {
    if (isScanning) return;

    setIsScanning(true);
    setLogs([]);
    setStats({
      totalFiles: 0,
      totalGroups: 0,
      current: 0,
      success: 0,
      skipped: 0,
      failed: 0
    });

    const url = `/api/admin/scan?force=${forceScan}`;
    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data: ScanProgress = JSON.parse(event.data);

        setLogs((prev) => [...prev, data]);

        if (data.type === 'start') {
          console.log('扫描开始:', data);
          // 记录当前扫描模式
          setCurrentScanMode(data.data?.mode || 'incremental');
        } else if (data.type === 'progress') {
          if (data.data?.totalFiles !== undefined) {
            setStats((prev) => ({ ...prev, totalFiles: data.data.totalFiles }));
          }
          if (data.data?.totalGroups !== undefined) {
            setStats((prev) => ({
              ...prev,
              totalGroups: data.data.totalGroups
            }));
          }
          if (data.data?.current !== undefined) {
            setStats((prev) => ({ ...prev, current: data.data.current }));
          }
        } else if (data.type === 'complete') {
          setStats((prev) => ({
            ...prev,
            success: data.data?.success || 0,
            skipped: data.data?.skipped || 0,
            failed: data.data?.failed || 0,
            duration: data.data?.duration
          }));
        } else if (data.type === 'error') {
          console.error('扫描错误:', data);
        } else if (data.type === 'end') {
          setIsScanning(false);
          eventSourceRef.current?.close();
          // 扫描完成后重新发现
          discoverPhotos();
        }
      } catch (error) {
        console.error('解析 SSE 消息失败:', error);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      setIsScanning(false);
      eventSourceRef.current?.close();
      setLogs((prev) => [
        ...prev,
        {
          type: 'error',
          message: '连接中断',
          data: { error: 'SSE 连接错误' }
        }
      ]);
    };
  }, [isScanning, forceScan, discoverPhotos]);

  // 停止扫描
  const stopScan = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // 页面加载时自动发现
  useEffect(() => {
    discoverPhotos();
  }, [discoverPhotos]);

  // 清理
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
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
  };
}
