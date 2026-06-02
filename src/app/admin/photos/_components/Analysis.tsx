'use client';

import { Button } from '@heroui/button';
import { useRef, useState } from 'react';
import { addToast } from '@heroui/toast';
import { useDisclosure } from '@heroui/modal';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ConfirmModal } from './ConfirmModal';

export const AnalysisAll = ({ onFinish }: { onFinish: () => void }) => {
  const [count, setCount] = useState({ current: 0, total: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 中止控制器引用，供停止操作使用
  const abortRef = useRef<AbortController | null>(null);
  // 标记是否为用户主动停止，避免触发错误提示
  const manualStopRef = useRef(false);

  const stopModal = useDisclosure();

  const startAnalysis = async () => {
    const abortController = new AbortController();
    abortRef.current = abortController;
    manualStopRef.current = false;

    setIsAnalyzing(true);
    setCount({ current: 0, total: 0 });

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
          const data = JSON.parse(event.data);
          setCount(data);

          if (data.status === 'error') {
            throw new Error(data.message || '分析过程出错');
          }

          if (data.status === 'done' || data.done) {
            addToast({
              title: '批量分析完成',
              description: `已完成 ${data.total} 张照片的分析`,
              color: 'success'
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

      // 用户主动停止，不视为错误
      if (manualStopRef.current) {
        return;
      }

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
      description: `已分析 ${count.current}/${count.total} 张照片`,
      color: 'warning'
    });

    // 刷新列表以展示已分析的结果
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
            当前已分析 {count.current}/{count.total}{' '}
            张照片，停止后剩余照片将不再处理。已完成的分析结果会保留。
          </>
        }
        confirmText="确认停止"
        cancelText="继续分析"
        onConfirm={handleConfirmStop}
      />
    </>
  );
};
