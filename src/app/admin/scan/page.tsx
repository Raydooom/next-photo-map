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

    eventSourceRef.current.onmessage = (event) => {
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

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      setIsScanning(false);
      eventSourceRef.current?.close();
      setLogs(prev => [...prev, {
        type: 'error',
        message: '连接中断',
        error: 'SSE 连接错误'
      }]);
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
        return <Badge color="primary">开始</Badge>;
      case 'progress':
        return <Badge color="default">进度</Badge>;
      case 'complete':
        return <Badge color="success">完成</Badge>;
      case 'error':
        return <Badge color="danger">错误</Badge>;
      case 'end':
        return <Badge color="default">结束</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">扫描控制</h2>
        <div className="flex items-center gap-4">
          <Switch
            isSelected={forceScan}
            onValueChange={setForceScan}
            disabled={isScanning}
            size="sm"
          >
            强制全量扫描
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

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">发现文件总数</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalFiles}</p>
          </CardBody>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">图片文件组数</p>
            <p className="text-3xl font-bold text-purple-600">{stats.totalGroups}</p>
          </CardBody>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">成功处理</p>
            <p className="text-3xl font-bold text-green-600">{stats.success}</p>
          </CardBody>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">处理失败</p>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </CardBody>
        </Card>
      </div>

      {isScanning && (
        <Card>
          <CardHeader>
            <h4>扫描进度</h4>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>当前进度</span>
                <span>{stats.current} / {stats.totalGroups}</span>
              </div>
              <Progress
                value={getProgressPercentage()}
                color="primary"
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600">
                {getProgressPercentage()}%
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h4>扫描日志</h4>
        </CardHeader>
        <CardBody>
          <ScrollShadow className="h-[500px]">
            <div className="space-y-2 font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">暂无日志</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 shrink-0">
                      {new Date().toLocaleTimeString('zh-CN')}
                    </span>
                    {getLogBadge(log.type)}
                    <span className={getLogColor(log.type)}>
                      {log.message}
                    </span>
                    {log.data?.filename && (
                      <span className="text-gray-500">
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

      {stats.duration && (
        <Card>
          <CardHeader>
            <h4>扫描结果</h4>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">扫描耗时</p>
                <p className="text-xl font-bold">{stats.duration} 秒</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">成功处理</p>
                <p className="text-xl font-bold text-green-600">{stats.success}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">跳过</p>
                <p className="text-xl font-bold text-yellow-600">{stats.skipped}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">失败</p>
                <p className="text-xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
