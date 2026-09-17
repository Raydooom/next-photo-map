import { Card, CardBody } from '@heroui/card';
import { Progress } from '@heroui/progress';

interface ScanStatsProps {
  isScanning: boolean;
  isForceScan: boolean;
  stats: {
    totalFiles: number;
    totalGroups: number;
    current: number;
    success: number;
    skipped: number;
    failed: number;
    duration?: string;
  };
}

export function ScanStats({ isScanning, isForceScan, stats }: ScanStatsProps) {
  const getProgressPercentage = () => {
    if (stats.totalGroups === 0) return 0;
    return Math.round((stats.current / stats.totalGroups) * 100);
  };

  return (
    <Card className="ring-1 ring-white/[0.08]">
      <CardBody className="p-3">
        <h4 className="text-sm font-semibold mb-3">扫描统计</h4>

        {/* 统计数字 */}
        <div
          className={`grid ${isForceScan ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mb-3`}
        >
          <div className="text-center p-2 rounded-lg bg-success/5">
            <div className="text-lg font-bold text-success">
              {stats.success}
            </div>
            <div className="text-[10px] text-default-500">成功</div>
          </div>
          {isForceScan && (
            <div className="text-center p-2 rounded-lg bg-warning/5">
              <div className="text-lg font-bold text-warning">
                {stats.skipped}
              </div>
              <div className="text-[10px] text-default-500">跳过</div>
            </div>
          )}
          <div className="text-center p-2 rounded-lg bg-danger/5">
            <div className="text-lg font-bold text-danger">{stats.failed}</div>
            <div className="text-[10px] text-default-500">失败</div>
          </div>
        </div>

        {/* 进度信息 */}
        {isScanning ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-default-600">
              <span>进度</span>
              <span>
                {stats.current}/{stats.totalGroups} ({getProgressPercentage()}%)
              </span>
            </div>
            <Progress
              value={getProgressPercentage()}
              color="primary"
              size="sm"
            />
          </div>
        ) : stats.duration ? (
          <div className="text-center text-xs text-success bg-success/5 rounded-lg py-1.5">
            ✓ 完成 · 耗时 {stats.duration}s
          </div>
        ) : (
          <div className="text-center text-xs text-default-400 py-1.5">
            等待扫描...
          </div>
        )}
      </CardBody>
    </Card>
  );
}
