import { useRef, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/card';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Badge } from '@heroui/badge';
import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { Play, Square } from 'lucide-react';
import type { ScanProgress } from './types';

interface ScanLogsProps {
  logs: ScanProgress[];
  isScanning: boolean;
  forceScan: boolean;
  onForceScanChange: (value: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  hasNewPhotos: boolean;
}

export function ScanLogs({
  logs,
  isScanning,
  forceScan,
  onForceScanChange,
  onStart,
  onStop,
  hasNewPhotos
}: ScanLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: ScanProgress['type']) => {
    switch (type) {
      case 'start':
        return 'text-primary';
      case 'progress':
        return 'text-default-600';
      case 'complete':
        return 'text-success';
      case 'error':
        return 'text-danger';
      case 'end':
        return 'text-default-500';
      default:
        return 'text-default-600';
    }
  };

  const getLogBadge = (type: ScanProgress['type']) => {
    const badgeProps = {
      size: 'sm' as const,
      variant: 'flat' as const
    };

    switch (type) {
      case 'start':
        return (
          <Badge {...badgeProps} color="primary">
            开始
          </Badge>
        );
      case 'progress':
        return (
          <Badge {...badgeProps} color="default">
            进行
          </Badge>
        );
      case 'complete':
        return (
          <Badge {...badgeProps} color="success">
            完成
          </Badge>
        );
      case 'error':
        return (
          <Badge {...badgeProps} color="danger">
            错误
          </Badge>
        );
      case 'end':
        return (
          <Badge {...badgeProps} color="default">
            结束
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="flex-1 overflow-hidden ring-1 ring-white/[0.08] min-h-0">
      <CardHeader className="pb-2 border-b border-divider px-3 py-2 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">扫描日志</h4>
          {logs.length > 0 && (
            <span className="text-[10px] text-default-400">
              ({logs.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            isSelected={forceScan}
            onValueChange={onForceScanChange}
            isDisabled={isScanning}
            size="sm"
          >
            <span className="text-xs">强制更新</span>
          </Switch>
          {isScanning ? (
            <Button
              color="danger"
              onPress={onStop}
              size="sm"
              startContent={<Square className="w-3.5 h-3.5" />}
            >
              停止
            </Button>
          ) : (
            <Button
              color={hasNewPhotos ? 'success' : 'default'}
              onPress={onStart}
              size="sm"
              startContent={<Play className="w-3.5 h-3.5" />}
              isDisabled={!hasNewPhotos && !forceScan}
            >
              {hasNewPhotos || forceScan ? '开始扫描' : '无新照片'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody className="p-3 h-full overflow-hidden">
        <ScrollShadow className="h-full">
          <div className="space-y-1 font-mono text-[10px]">
            {logs.length === 0 ? (
              <p className="text-default-400 text-center py-4 text-xs">
                等待扫描...
              </p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5 py-0.5">
                  <span className="text-default-400 shrink-0 text-[9px] pt-0.5 w-12">
                    {new Date().toLocaleTimeString('zh-CN', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                  <div className="shrink-0 scale-90">
                    {getLogBadge(log.type)}
                  </div>
                  <span
                    className={`${getLogColor(log.type)} flex-1 leading-tight`}
                  >
                    {log.message}
                  </span>
                  {log.data?.filename && (
                    <span className="text-default-500 truncate max-w-[200px] text-[9px]">
                      {log.data.filename}
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
  );
}
