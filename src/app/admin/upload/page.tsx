'use client';

import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Upload, XCircle } from 'lucide-react';
import { useUpload } from './_hooks/useUpload';
import { FileUploadZone, FileList, UploadStats } from './_components';

export default function UploadPage() {
  const {
    items,
    isUploading,
    stats,
    addFiles,
    removeItem,
    clearAll,
    startUpload,
    cancelUpload,
    formatSize
  } = useUpload();

  const hasUploadable = stats.pending > 0 || stats.error > 0;

  return (
    <div className="md:h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 md:overflow-hidden">
      {/* 左侧：上传区域 + 统计 + 操作 */}
      <div className="w-full md:w-[320px] md:flex-shrink-0 flex flex-col gap-3">
        <Card className="ring-1 ring-white/[0.08]">
          <CardBody className="p-3 flex flex-col gap-3">
            <FileUploadZone onAddFiles={addFiles} disabled={isUploading} />
            <UploadStats stats={stats} formatSize={formatSize} />

            {items.length > 0 && (
              <div className="flex items-center gap-2">
                {isUploading ? (
                  <Button
                    color="danger"
                    variant="flat"
                    className="flex-1"
                    onPress={cancelUpload}
                    startContent={<XCircle className="w-4 h-4" />}
                  >
                    取消上传
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    className="flex-1"
                    onPress={startUpload}
                    isDisabled={!hasUploadable}
                    startContent={<Upload className="w-4 h-4" />}
                  >
                    {hasUploadable
                      ? `上传 ${stats.pending + stats.error} 个文件`
                      : '已全部上传'}
                  </Button>
                )}
              </div>
            )}

            {stats.total > 0 && (
              <p className="text-[10px] text-default-400 text-center">
                总大小 {formatSize(stats.totalSize)}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* 右侧：文件列表 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[300px] md:min-h-0">
        <FileList
          items={items}
          isUploading={isUploading}
          onRemove={removeItem}
          onClear={clearAll}
          formatSize={formatSize}
        />
      </div>
    </div>
  );
}
