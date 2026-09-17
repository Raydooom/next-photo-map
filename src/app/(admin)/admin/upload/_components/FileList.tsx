import { Card, CardHeader, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Progress } from '@heroui/progress';
import { Chip } from '@heroui/chip';
import { ScrollShadow } from '@heroui/scroll-shadow';
import {
  X,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Trash2
} from 'lucide-react';
import type { UploadItem, UploadItemStatus } from './types';

interface FileListProps {
  items: UploadItem[];
  isUploading: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  formatSize: (bytes: number) => string;
}

const statusConfig: Record<
  UploadItemStatus,
  { color: 'default' | 'primary' | 'success' | 'danger'; label: string }
> = {
  pending: { color: 'default', label: '等待' },
  uploading: { color: 'primary', label: '上传中' },
  success: { color: 'success', label: '已入库' },
  error: { color: 'danger', label: '失败' }
};

function StatusIcon({ status }: { status: UploadItemStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-danger" />;
    case 'uploading':
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-default-400" />;
  }
}

export function FileList({
  items,
  isUploading,
  onRemove,
  onClear,
  formatSize
}: FileListProps) {
  return (
    <Card className="flex-1 overflow-hidden ring-1 ring-white/[0.08] min-h-0">
      <CardHeader className="border-b border-divider px-3 py-2 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">文件列表</h4>
          {items.length > 0 && (
            <span className="text-[10px] text-default-400">
              ({items.length})
            </span>
          )}
        </div>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="light"
            color="danger"
            isDisabled={isUploading}
            onPress={onClear}
            startContent={<Trash2 className="w-3.5 h-3.5" />}
          >
            清空
          </Button>
        )}
      </CardHeader>
      <CardBody className="p-3 h-full overflow-hidden">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-default-400">
            暂无文件，请先选择
          </div>
        ) : (
          <ScrollShadow className="h-full">
            <div className="space-y-2">
              {items.map((item) => {
                const config = statusConfig[item.status];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-default-50 ring-1 ring-white/[0.04]"
                  >
                    {/* 预览 / 图标 */}
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-default-100 shrink-0 flex items-center justify-center">
                      {item.kind === 'image' && item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileVideo className="w-5 h-5 text-default-400" />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {item.name}
                        </span>
                        {item.isLivePhoto && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="secondary"
                            className="h-4 text-[9px] px-1"
                          >
                            Live
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-default-400">
                          {formatSize(item.size)}
                        </span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={config.color}
                          className="h-4 text-[9px] px-1"
                        >
                          {config.label}
                        </Chip>
                      </div>
                      {item.status === 'uploading' && (
                        <Progress
                          value={item.progress}
                          color="primary"
                          size="sm"
                          className="mt-1"
                        />
                      )}
                      {item.status === 'error' && item.error && (
                        <p className="text-[10px] text-danger mt-0.5 truncate">
                          {item.error}
                        </p>
                      )}
                    </div>

                    {/* 状态图标 / 删除 */}
                    <div className="shrink-0 flex items-center">
                      {item.status === 'uploading' ? (
                        <StatusIcon status={item.status} />
                      ) : (
                        <Button
                          size="sm"
                          isIconOnly
                          variant="light"
                          radius="full"
                          onPress={() => onRemove(item.id)}
                          className="w-6 h-6 min-w-6"
                        >
                          <X className="w-3.5 h-3.5 text-default-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollShadow>
        )}
      </CardBody>
    </Card>
  );
}
