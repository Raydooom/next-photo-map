import { Button } from '@heroui/button';
import { useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export const AnalysisAll = ({ onFinish }: { onFinish: () => void }) => {
  const [count, setCount] = useState({
    current: 0,
    total: 0
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const startAnalysis = async () => {
    const abortController = new AbortController();
    setIsAnalyzing(true);
    await fetchEventSource('/api/ai/analysis', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: abortController.signal,
      onmessage: event => {
        const { data } = event;
        const countData = JSON.parse(data);
        setCount(countData);
        if (countData.done) onFinish();
      },
      onclose() {
        console.log('连接正常关闭');
        setIsAnalyzing(false);
        abortController.abort();
      },
      onerror(err) {
        console.error('发生错误:', err);
        setIsAnalyzing(false);
        abortController.abort();
        throw err;
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        disabled={count.current === count.total && count.total > 0}
        onPress={startAnalysis}
      >
        分析所有照片
        {isAnalyzing ? ` (${count.current}/${count.total})` : ` `}
      </Button>
    </>
  );
};
