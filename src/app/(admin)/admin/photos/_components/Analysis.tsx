'use client';

import { Button } from '@heroui/button';
import { useRef, useState } from 'react';
import { addToast } from '@heroui/toast';
import { useDisclosure } from '@heroui/modal';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ConfirmModal } from './ConfirmModal';

type AnalysisProgress = {
  current: number;
  total: number;
  failed: number;
};

export const AnalysisAll = ({ onFinish }: { onFinish: () => void }) => {
  const [count, setCount] = useState<AnalysisProgress>({
    current: 0,
    total: 0,
    failed: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const manualStopRef = useRef(false);
  const stopModal = useDisclosure();

  const startAnalysis = async () => {
    const abortController = new AbortController();
    abortRef.current = abortController;
    manualStopRef.current = false;

    setIsAnalyzing(true);
    setCount({ current: 0, total: 0, failed: 0 });

    try {
      await fetchEventSource('/api/ai/analysis', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        openWhenHidden: true,
        onopen: async (response) => {
          if (!response.ok) {
            throw new Error(`服务响应异常: ${response.status}`);
          }
        },
        onmessage: (event) => {
          const data = JSON.parse(event.data) as Partial<AnalysisProgress> & {
            status?: string;
            done?: boolean;
            message?: string;
          };
          setCount((previous) => ({
            current: data.current ?? previous.current,
            total: data.total ?? previous.total,
            failed: data.failed ?? previous.failed
          }));

          if (data.status === 'error') {
            throw new Error(data.message || '分析过程出错');
          }

          if (data.status === 'done' || data.done) {
            addToast({
              title: data.failed ? '批量分析完成，但有失败项' : '批量分析完成',
              description: `已处理 ${data.total ?? 0} 张照片，失败 ${data.failed ?? 0} 张`,
              color: data.failed ? 'warning' : 'success'
            });
            onFinish();
          }
        },
        onclose() {
          setIsAnalyzing(false);
          abortController.abort();
        },
        onerror(err) {
          setIsAnalyzing(false);
          abortController.abort();
          throw err;
        }
      });
    } catch (error) {
      setIsAnalyzing(false);

      if (manualStopRef.current) return;

      console.error('批量分析失败:', error);
      addToast({
        title: '批量分析失败',
        description:
          error instanceof Error
            ? error.message
            : '分析服务暂时不可用，请稍后重试',
        color: 'danger'
      });
    }
  };

  const handleConfirmStop = () => {
    manualStopRef.current = true;
    abortRef.current?.abort();
    setIsAnalyzing(false);

    addToast({
      title: '已停止分析',
      description: `已处理 ${count.current}/${count.total} 张，失败 ${count.failed} 张`,
      color: 'warning'
    });

    onFinish();
  };

  const progressText = isAnalyzing ? ` (${count.current}/${count.total})` : '';

  return (
    <>
      {isAnalyzing ? (
        <Button
          size="sm"
          color="danger"
          variant="flat"
          onPress={stopModal.onOpen}
        >
          停止分析{progressText}
        </Button>
      ) : (
        <Button size="sm" color="secondary" onPress={startAnalysis}>
          分析所有照片
        </Button>
      )}

      <ConfirmModal
        isOpen={stopModal.isOpen}
        onOpenChange={stopModal.onOpenChange}
        title="确认停止分析"
        message={
          <>
            当前已处理 {count.current}/{count.total} 张照片，停止后剩余照片将不再处理。已完成的分析结果会保留。
          </>
        }
        confirmText="确认停止"
        cancelText="继续分析"
        onConfirm={handleConfirmStop}
      />
    </>
  );
};
