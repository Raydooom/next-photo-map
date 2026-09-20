'use client';

import { Button } from '@heroui/button';
import { Badge } from '@heroui/badge';
import { Image } from '@heroui/image';
import { TableCell, TableRow } from '@heroui/table';
import { formatDateCN } from '@/lib/format';
import { PhotoRow } from './types';

export interface PhotoRowActions {
  onMarkLocation: (photo: PhotoRow) => void;
  onDeleteLocation: (photo: PhotoRow) => void;
  onToggleTop: (photo: PhotoRow) => void;
  onDelete: (photo: PhotoRow) => void;
  onAnalyze: (photo: PhotoRow) => void;
}

// 行数据：在基础 PhotoRow 上附加运行时状态


/**
 * 渲染单行照片记录
 *
 * 注意：这是一个渲染函数而非 React 组件。
 * HeroUI/React-Aria 的 Table 集合机制要求 TableBody 的子节点
 * 必须是真实的 TableRow 元素，不能包裹在自定义组件中。
 */
export function renderPhotoRow(photo: PhotoRow, actions: PhotoRowActions) {
  const { onMarkLocation, onDeleteLocation, onToggleTop, onDelete, onAnalyze } =
    actions;

  const isAnalyzing = Boolean(photo.isAnalyzing);

  return (
    <TableRow key={photo.id}>
      <TableCell>
        {photo.fileExists && photo.thumbLargeUrl ? (
          <Image
            src={photo.thumbLargeUrl}
            alt={photo.filename}
            className="object-cover max-w-[50px] max-h-[50px] rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
            无缩略图
          </div>
        )}
      </TableCell>
      <TableCell>{photo.id}</TableCell>
      <TableCell className="max-w-xs truncate" title={photo.filename}>
        {photo.filename}
      </TableCell>
      <TableCell>{photo.photoAiAnalysis?.tags?.join(', ') || '-'}</TableCell>
      <TableCell>{formatDateCN(photo.takenAt)}</TableCell>
      <TableCell>{formatDateCN(photo.createdAt)}</TableCell>
      <TableCell>
        <Badge color={photo.fileExists ? 'success' : 'danger'}>
          {photo.fileExists ? '存在' : '丢失'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          {!photo.location ? (
            <Button
              variant="flat"
              size="sm"
              onPress={() => onMarkLocation(photo)}
            >
              标记位置
            </Button>
          ) : (
            <Button
              color="warning"
              variant="flat"
              size="sm"
              onPress={() => onDeleteLocation(photo)}
            >
              删除位置
            </Button>
          )}
          <Button
            color={photo.top ? 'primary' : 'secondary'}
            variant="flat"
            size="sm"
            onPress={() => onToggleTop(photo)}
          >
            {photo.top ? '取消置顶' : '置顶'}
          </Button>
          <Button
            variant="flat"
            color="danger"
            size="sm"
            onPress={() => onDelete(photo)}
          >
            删除
          </Button>
          <Button
            variant="flat"
            color="secondary"
            size="sm"
            isLoading={isAnalyzing}
            isDisabled={isAnalyzing}
            onPress={() => onAnalyze(photo)}
          >
            {isAnalyzing ? '分析中' : 'AI分析'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
