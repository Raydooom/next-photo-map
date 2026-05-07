'use client';
import { useState, useCallback, useRef } from 'react';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Badge } from '@heroui/badge';
import { ScrollShadow } from '@heroui/scroll-shadow';

interface LogEntry {
  step: string;
  status: string;
  message: string;
  duration?: number;
  isDetail?: boolean;
}

interface StepResult {
  step: string;
  success: boolean;
  message: string;
  duration?: number;
}

export default function DeployPage() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isKilled, setIsKilled] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showDetailLogs, setShowDetailLogs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const handleRebuild = useCallback(async () => {
    setIsDeploying(true);
    setIsStopping(false);
    setLogs([]);
    setStepResults([]);
    setIsComplete(false);
    setIsSuccess(false);
    setIsKilled(false);
    setTotalDuration(0);

    const startTime = Date.now();
    const eventSource = new EventSource('/api/deploy');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = event => {
      try {
        const data: LogEntry = JSON.parse(event.data);
        setLogs(prev => [...prev, data]);

        // Auto scroll to bottom
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }, 10);

        if (
          data.status === 'success' ||
          data.status === 'error' ||
          data.status === 'warning' ||
          data.status === 'killed'
        ) {
          setStepResults(prev => [
            ...prev,
            {
              step: data.step,
              success: data.status === 'success',
              message: data.message,
              duration: data.duration
            }
          ]);
        }

        if (data.step === 'done') {
          setIsComplete(true);
          setIsDeploying(false);
          setIsStopping(false);
          setTotalDuration(Date.now() - startTime);

          if (data.status === 'success') {
            setIsSuccess(true);
          } else if (data.status === 'killed') {
            setIsKilled(true);
            setIsSuccess(false);
          } else {
            setIsSuccess(false);
          }

          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      setLogs(prev => [
        ...prev,
        {
          step: 'error',
          status: 'error',
          message: '连接中断或发生错误'
        }
      ]);
      eventSource.close();
      eventSourceRef.current = null;
      setIsDeploying(false);
      setIsStopping(false);
      setIsComplete(true);
      setIsSuccess(false);
    };
  }, []);

  const handleStop = useCallback(async () => {
    if (!eventSourceRef.current) return;

    setIsStopping(true);
    try {
      const response = await fetch('/api/deploy', { method: 'POST' });
      const result = await response.json();
      if (!result.success) {
        console.error('Failed to stop:', result.message);
        setIsStopping(false);
      }
    } catch (error) {
      console.error('Failed to stop:', error);
      setIsStopping(false);
    }
  }, []);

  const handleReset = () => {
    setLogs([]);
    setStepResults([]);
    setIsComplete(false);
    setIsSuccess(false);
    setIsKilled(false);
    setTotalDuration(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'killed':
        return 'warning';
      case 'stdout':
        return 'secondary';
      case 'stderr':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'error':
        return '失败';
      case 'warning':
        return '警告';
      case 'killed':
        return '已停止';
      case 'running':
        return '进行中';
      case 'stdout':
        return '输出';
      case 'stderr':
        return '错误';
      default:
        return status;
    }
  };

  const displayLogs = showDetailLogs ? logs : logs.filter(log => !log.isDetail);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">重建服务</h2>
        <div className="flex gap-2">
          {isComplete && (
            <Button color="secondary" size="sm" onPress={handleReset}>
              重置日志
            </Button>
          )}
          <Button
            variant="bordered"
            size="sm"
            onPress={() => setShowDetailLogs(!showDetailLogs)}
          >
            {showDetailLogs ? '隐藏详细日志' : '显示详细日志'}
          </Button>
          {isDeploying ? (
            <Button
              color="danger"
              size="sm"
              onPress={handleStop}
              disabled={isStopping}
            >
              {isStopping ? '正在停止...' : '停止构建'}
            </Button>
          ) : (
            <Button color="primary" size="sm" onPress={handleRebuild}>
              执行重建
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 flex items-center justify-between">
          <h4 className="text-sm">实时日志</h4>
          <span className="text-xs text-gray-500">
            共 {logs.length} 条日志
            {showDetailLogs ? '（含详细输出）' : '（仅关键步骤）'}
          </span>
        </CardHeader>
        <CardBody className="p-4">
          <ScrollShadow
            ref={scrollRef}
            className="h-96 bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-y-auto"
          >
            {displayLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                暂无日志，点击上方按钮开始重建
              </p>
            ) : (
              <div className="space-y-1">
                {displayLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`${log.isDetail ? 'pl-4 opacity-80' : ''}`}
                  >
                    {log.isDetail ? (
                      <span
                        className={`${
                          log.status === 'stderr'
                            ? 'text-red-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {log.status === 'stderr' && (
                          <span className="text-red-500">[ERR] </span>
                        )}
                        {log.message}
                      </span>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Badge
                          color={getStatusColor(log.status)}
                          className="flex-shrink-0 mt-0.5"
                          size="sm"
                        >
                          {getStatusText(log.status)}
                        </Badge>
                        <span className="text-gray-200">
                          <span className="text-gray-400">[{log.step}]</span>{' '}
                          {log.message}
                          {log.duration && (
                            <span className="text-gray-500">
                              {' '}
                              ({formatDuration(log.duration)})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollShadow>
        </CardBody>
      </Card>

      {isComplete && (
        <Card>
          <CardHeader className="pb-2">
            <h4 className="text-sm">重建结果</h4>
          </CardHeader>
          <CardBody className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Badge
                color={isKilled ? 'warning' : isSuccess ? 'success' : 'danger'}
              >
                {isKilled ? '已停止' : isSuccess ? '重建成功' : '重建失败'}
              </Badge>
              <span className="text-sm text-gray-500">
                总耗时: {formatDuration(totalDuration)}
              </span>
            </div>

            <div className="space-y-3">
              {stepResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{result.step}</span>
                    <Badge color={result.success ? 'success' : 'danger'}>
                      {result.success ? '成功' : '失败'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">{result.message}</div>
                  {result.duration && (
                    <div className="text-xs text-gray-500 mt-1">
                      耗时: {formatDuration(result.duration)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
