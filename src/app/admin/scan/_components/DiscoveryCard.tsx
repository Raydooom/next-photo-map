import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Spinner } from '@heroui/spinner';
import { RefreshCw } from 'lucide-react';

interface DiscoveryCardProps {
  isDiscovering: boolean;
  discoveryInfo: {
    totalFiles: number;
    totalGroups: number;
    existingCount: number;
    newCount: number;
  } | null;
  onRefresh: () => void;
}

export function DiscoveryCard({
  isDiscovering,
  discoveryInfo,
  onRefresh
}: DiscoveryCardProps) {
  return (
    <Card className="ring-1 ring-white/[0.08]">
      <CardBody className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">照片发现</h3>
          <Button
            size="sm"
            variant="light"
            isIconOnly
            onPress={onRefresh}
            isDisabled={isDiscovering}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>

        {isDiscovering ? (
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
            <span className="ml-2 text-xs text-default-600">扫描中...</span>
          </div>
        ) : discoveryInfo ? (
          <div className="grid grid-cols-2 gap-2">
            {/* 总照片 */}
            <div className="text-center p-2 rounded-lg bg-primary/5 ring-1 ring-primary/10">
              <div className="text-xl font-bold text-primary">
                {discoveryInfo.totalGroups}
              </div>
              <div className="text-[10px] text-default-500 mt-0.5">
                目录照片
              </div>
            </div>

            {/* 待扫描 */}
            <div className="text-center p-2 rounded-lg bg-success/5 ring-1 ring-success/10">
              <div className="text-xl font-bold text-success">
                {discoveryInfo.newCount}
              </div>
              <div className="text-[10px] text-default-500 mt-0.5">待扫描</div>
            </div>

            {/* 已入库 */}
            <div className="text-center p-2 rounded-lg bg-default/5 ring-1 ring-default/10">
              <div className="text-xl font-bold text-default-600">
                {discoveryInfo.existingCount}
              </div>
              <div className="text-[10px] text-default-500 mt-0.5">已入库</div>
            </div>

            {/* 发现文件 */}
            <div className="text-center p-2 rounded-lg bg-secondary/5 ring-1 ring-secondary/10">
              <div className="text-xl font-bold text-secondary">
                {discoveryInfo.totalFiles}
              </div>
              <div className="text-[10px] text-default-500 mt-0.5">总文件</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-default-400">
            暂无数据
          </div>
        )}
      </CardBody>
    </Card>
  );
}
