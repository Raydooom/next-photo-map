import { Button } from '@heroui/button';
import { Switch } from '@heroui/switch';
import { Play, Square } from 'lucide-react';

interface ScanControlsProps {
  isScanning: boolean;
  forceScan: boolean;
  onForceScanChange: (value: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  hasNewPhotos: boolean;
}

export function ScanControls({
  isScanning,
  forceScan,
  onForceScanChange,
  onStart,
  onStop,
  hasNewPhotos
}: ScanControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold">扫描控制</h2>
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
    </div>
  );
}
