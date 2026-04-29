'use client';
import { useState, useEffect } from 'react';
import * as Admin from '@/server/actions/admin';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Badge } from '@heroui/badge';
import { ScrollShadow } from '@heroui/scroll-shadow';
import {
  Table,
  TableBody,
  TableColumn,
  TableCell,
  TableHeader,
  TableRow
} from '@heroui/table';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/modal';

interface Photo {
  id: number;
  filename: string;
  originalPath: string;
  takenAt: string | null;
  fileExists: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, exists: 0, missing: 0 });
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const {
    isOpen: isDeleteModalOpen,
    onOpen: openDeleteModal,
    onOpenChange: onDeleteModalOpenChange
  } = useDisclosure();

  const {
    isOpen: isBatchDeleteModalOpen,
    onOpen: openBatchDeleteModal,
    onOpenChange: onBatchDeleteModalOpenChange
  } = useDisclosure();

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await Admin.getPhotosWithFileStatus();
      const formattedPhotos: Photo[] = data.map(p => ({
        id: p.id,
        filename: p.filename,
        originalPath: p.originalPath,
        takenAt: p.takenAt?.toISOString() || null,
        fileExists: (p as any).fileExists,
        createdAt: p.createdAt.toISOString()
      }));
      setPhotos(formattedPhotos);

      const existsCount = formattedPhotos.filter(p => p.fileExists).length;
      setStats({
        total: formattedPhotos.length,
        exists: existsCount,
        missing: formattedPhotos.length - existsCount
      });
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return;
    try {
      await Admin.deletePhoto(selectedPhoto.id);
      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
      setStats(prev => ({
        total: prev.total - 1,
        exists: prev.exists - 1,
        missing: prev.missing
      }));
      onDeleteModalOpenChange();
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleDeleteMissingPhotos = async () => {
    setLoading(true);
    try {
      const result = await Admin.deleteMissingPhotos();
      setPhotos(prev => prev.filter(p => p.fileExists));
      setStats({
        total: result.totalChecked - result.success,
        exists: result.totalChecked - result.missingCount,
        missing: 0
      });
      onBatchDeleteModalOpenChange();
      alert(
        `批量删除完成\n检查总数: ${result.totalChecked}\n缺失数量: ${result.missingCount}\n删除成功: ${result.success}\n删除失败: ${result.failed}`
      );
    } catch (error) {
      console.error('Failed to delete missing photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未知';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const handleOpenDeleteModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    openDeleteModal();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">图片管理</h1>
        <Button onPress={() => loadPhotos()} disabled={loading}>
          刷新列表
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">总图片数</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </CardBody>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">文件存在</p>
            <p className="text-3xl font-bold text-green-600">{stats.exists}</p>
          </CardBody>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardBody className="pt-6">
            <p className="text-sm text-gray-600">文件丢失</p>
            <p className="text-3xl font-bold text-red-600">{stats.missing}</p>
          </CardBody>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onPress={() => Admin.scanner()} disabled={loading}>
          开始扫描
        </Button>
        <Button
          variant="shadow"
          disabled={loading || stats.missing === 0}
          onPress={openBatchDeleteModal}
        >
          批量删除丢失文件
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h4>图片列表</h4>
        </CardHeader>
        <CardBody>
          <ScrollShadow className="h-[500px]">
            <Table>
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>文件名</TableColumn>
                <TableColumn>拍摄时间</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>文件状态</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : photos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      暂无图片
                    </TableCell>
                  </TableRow>
                ) : (
                  photos.map(photo => (
                    <TableRow key={photo.id}>
                      <TableCell>{photo.id}</TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={photo.filename}
                      >
                        {photo.filename}
                      </TableCell>
                      <TableCell>{formatDate(photo.takenAt)}</TableCell>
                      <TableCell>{formatDate(photo.createdAt)}</TableCell>
                      <TableCell>
                        <Badge color={photo.fileExists ? 'success' : 'danger'}>
                          {photo.fileExists ? '存在' : '丢失'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="shadow"
                          size="sm"
                          onPress={() => handleOpenDeleteModal(photo)}
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollShadow>
        </CardBody>
      </Card>

      {/* 删除单张图片 Modal */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                确认删除
              </ModalHeader>
              <ModalBody>
                <p>将删除图片 {selectedPhoto?.filename}，此操作不可恢复。</p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={handleDeletePhoto}>
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 批量删除 Modal */}
      <Modal
        isOpen={isBatchDeleteModalOpen}
        onOpenChange={onBatchDeleteModalOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                确认批量删除
              </ModalHeader>
              <ModalBody>
                <p>
                  将删除 {stats.missing}{' '}
                  个文件已丢失的图片记录，此操作不可恢复。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={handleDeleteMissingPhotos}>
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
