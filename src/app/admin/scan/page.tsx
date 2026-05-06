'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Badge } from '@heroui/badge';
import { Progress } from '@heroui/progress';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Switch } from '@heroui/switch';

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

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [forceScan, setForceScan] = useState(false);
  const [logs, setLogs] = useState<ScanProgress[]>([]);
  const [stats, setStats] = useState<ScanStats>({
    totalFiles: 0,
    totalGroups: 0,
    current: 0,
    success: 0,
    skipped: 0,
    failed: 0
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const startScan = () => {
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

    eventSourceRef.current.onmessage = event => {
      try {
        const data: ScanProgress = JSON.parse(event.data);

        setLogs(prev => [...prev, data]);

        if (data.type === 'start') {
          console.log('扫描开始:', data);
        } else if (data.type === 'progress') {
          if (data.data?.totalFiles !== undefined) {
            setStats(prev => ({ ...prev, totalFiles: data.data.totalFiles }));
          }
          if (data.data?.totalGroups !== undefined) {
            setStats(prev => ({ ...prev, totalGroups: data.data.totalGroups }));
          }
          if (data.data?.current !== undefined) {
            setStats(prev => ({ ...prev, current: data.data.current }));
          }
        } else if (data.type === 'complete') {
          setStats(prev => ({
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
        }
      } catch (error) {
        console.error('解析 SSE 消息失败:', error);
      }
    };

    eventSourceRef.current.onerror = error => {
      console.error('SSE 连接错误:', error);
      setIsScanning(false);
      eventSourceRef.current?.close();
      setLogs(prev => [
        ...prev,
        {
          type: 'error',
          message: '连接中断',
          error: 'SSE 连接错误'
        }
      ]);
    };
  };

  const stopScan = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getProgressPercentage = () => {
    if (stats.totalGroups === 0) return 0;
    return Math.round((stats.current / stats.totalGroups) * 100);
  };

  const getLogColor = (type: ScanProgress['type']) => {
    switch (type) {
      case 'start':
        return 'text-blue-600';
      case 'progress':
        return 'text-gray-600';
      case 'complete':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'end':
        return 'text-gray-500';
      default:
        return 'text-gray-600';
    }
  };

  const getLogBadge = (type: ScanProgress['type']) => {
    switch (type) {
      case 'start':
        return (
          <Badge color="primary" size="sm">
            开始
          </Badge>
        );
      case 'progress':
        return (
          <Badge color="default" size="sm">
            进度
          </Badge>
        );
      case 'complete':
        return (
          <Badge color="success" size="sm">
            完成
          </Badge>
        );
      case 'error':
        return (
          <Badge color="danger" size="sm">
            错误
          </Badge>
        );
      case 'end':
        return (
          <Badge color="default" size="sm">
            结束
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3 overflow-hidden">
      {/* 控制栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold">扫描控制</h2>
        <div className="flex items-center gap-3">
          <Switch
            isSelected={forceScan}
            onValueChange={setForceScan}
            disabled={isScanning}
            size="sm"
          >
            强制更新
          </Switch>
          {isScanning ? (
            <Button color="danger" onPress={stopScan} size="sm">
              停止扫描
            </Button>
          ) : (
            <Button onPress={startScan} size="sm">
              开始扫描
            </Button>
          )}
        </div>
      </div>

      {/* 统计卡片 + 进度条 + 扫描结果 */}
      <Card className="flex-shrink-0 pt-3">
        <CardBody className="p-3">
          {/* 统计数字 */}
          <div className="grid grid-cols-6 gap-3 mb-3">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">发现文件</p>
              <p className="text-xl font-bold text-blue-600">
                {stats.totalFiles}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">图片组数</p>
              <p className="text-xl font-bold text-purple-600">
                {stats.totalGroups}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">成功</p>
              <p className="text-xl font-bold text-green-600">
                {stats.success}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">跳过</p>
              <p className="text-xl font-bold text-yellow-600">
                {stats.skipped}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">失败</p>
              <p className="text-xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">耗时</p>
              <p className="text-xl font-bold">{stats.duration || '--'}s</p>
            </div>
          </div>

          {/* 进度条或结果 */}
          {isScanning ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>扫描进度</span>
                <span>
                  {stats.current} / {stats.totalGroups} (
                  {getProgressPercentage()}%)
                </span>
              </div>
              <Progress
                value={getProgressPercentage()}
                color="primary"
                className="w-full h-2"
              />
            </div>
          ) : stats.duration ? (
            <div className="text-center text-xs text-gray-400 rounded py-1">
              ✓ 扫描完成，共处理 {stats.totalGroups} 组图片
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-1">
              等待开始扫描...
            </div>
          )}
        </CardBody>
      </Card>

      {/* 日志区域 */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <h4 className="text-sm">扫描日志</h4>
        </CardHeader>
        <CardBody className="p-3 h-full">
          <ScrollShadow className="h-full">
            <div className="space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  点击 开始扫描 开始处理
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 shrink-0 text-[10px]">
                      {new Date().toLocaleTimeString('zh-CN', {
                        hour12: false
                      })}
                    </span>
                    {getLogBadge(log.type)}
                    <span className={getLogColor(log.type)}>{log.message}</span>
                    {log.data?.filename && (
                      <span className="text-gray-500 truncate max-w-[300px]">
                        - {log.data.filename}
                      </span>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollShadow>
        </CardBody>
      </Card>
    </div>
  );
}
