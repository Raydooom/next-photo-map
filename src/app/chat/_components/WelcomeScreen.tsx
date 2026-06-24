'use client';

import { Button } from '@heroui/button';
import { Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function WelcomeScreen({
  suggestions = ['故宫附近有什么照片', '夕阳下的建筑', '春季拍摄技巧'],
  onSuggestionClick
}: WelcomeScreenProps) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-default-700 mb-2">
        欢迎使用摄影助手
      </h3>
      <p className="text-default-400 mb-6 max-w-md mx-auto">
        我可以帮你搜索照片、分析构图、解读光影，或发现照片背后的故事
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="flat"
            size="sm"
            className="bg-content2"
            onPress={() => onSuggestionClick?.(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
