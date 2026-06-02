'use client';

import { ScrollShadow } from '@heroui/scroll-shadow';
import { Spinner } from '@heroui/spinner';
import { Table, TableBody, TableColumn, TableHeader } from '@heroui/table';
import { Photo } from './types';
import { renderPhotoRow, PhotoRowActions } from './PhotoTableRow';

interface PhotosTableProps extends PhotoRowActions {
  photos: Photo[];
  loading: boolean;
}

const COLUMNS = [
  '缩略图',
  'ID',
  '文件名',
  'AI标签',
  '拍摄时间',
  '创建时间',
  '文件状态',
  '操作'
];

export function PhotosTable({ photos, loading, ...actions }: PhotosTableProps) {
  return (
    <ScrollShadow className="h-[calc(100vh-220px)]">
      <Table aria-label="照片列表">
        <TableHeader>
          {COLUMNS.map((col) => (
            <TableColumn key={col}>{col}</TableColumn>
          ))}
        </TableHeader>
        <TableBody
          items={loading ? [] : photos}
          isLoading={loading}
          loadingContent={<Spinner label="加载中..." />}
          emptyContent={loading ? ' ' : '暂无图片'}
        >
          {(photo: Photo) => renderPhotoRow(photo, actions)}
        </TableBody>
      </Table>
    </ScrollShadow>
  );
}
