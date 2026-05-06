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
import { Image } from '@heroui/image';
import { Tabs, Tab } from '@heroui/tabs';
import { Input } from '@heroui/input';

interface Photo {
  id: number;
  filename: string;
  originalPath: string;
  originalKey: string | null;
  thumbLargeKey: string | null;
  takenAt: string | null;
  fileExists: boolean;
  createdAt: string;
  hasLocation?: boolean;
}

export default function PhotosManagementPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    exists: 0,
    missing: 0,
    noLocation: 0
  });
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

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

  const {
    isOpen: isLocationModalOpen,
    onOpen: openLocationModal,
    onOpenChange: onLocationModalOpenChange
  } = useDisclosure();

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const data = await Admin.getPhotosWithFileStatus();
      const formattedPhotos: Photo[] = data.map(p => ({
        id: p.id,
        filename: p.filename,
        originalPath: p.originalPath,
        originalKey: p.originalKey,
        thumbLargeKey: p.thumbLargeKey,
        takenAt: p.takenAt?.toISOString() || null,
        fileExists: (p as any).fileExists,
        createdAt: p.createdAt.toISOString(),
        hasLocation: !!(p.photoExif?.latitude && p.photoExif?.longitude)
      }));
      setPhotos(formattedPhotos);
      updateStats(formattedPhotos);
      filterPhotos(formattedPhotos, activeTab);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (photoList: Photo[]) => {
    const existsCount = photoList.filter(p => p.fileExists).length;
    const noLocationCount = photoList.filter(p => !p.hasLocation).length;
    setStats({
      total: photoList.length,
      exists: existsCount,
      missing: photoList.length - existsCount,
      noLocation: noLocationCount
    });
  };

  const filterPhotos = (photoList: Photo[], tab: string) => {
    if (tab === 'all') {
      setFilteredPhotos(photoList);
    } else if (tab === 'missing') {
      setFilteredPhotos(photoList.filter(p => !p.fileExists));
    } else if (tab === 'noLocation') {
      setFilteredPhotos(photoList.filter(p => !p.hasLocation));
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    filterPhotos(photos, key);
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return;
    try {
      await Admin.deletePhoto(selectedPhoto.id);
      const updatedPhotos = photos.filter(p => p.id !== selectedPhoto.id);
      setPhotos(updatedPhotos);
      updateStats(updatedPhotos);
      filterPhotos(updatedPhotos, activeTab);
      onDeleteModalOpenChange(false);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleDeleteMissingPhotos = async () => {
    setLoading(true);
    try {
      const result = await Admin.deleteMissingPhotos();
      const updatedPhotos = photos.filter(p => p.fileExists);
      setPhotos(updatedPhotos);
      updateStats(updatedPhotos);
      filterPhotos(updatedPhotos, activeTab);
      onBatchDeleteModalOpenChange(false);
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

  const getThumbnailUrl = (photo: Photo) => {
    if (!photo.thumbLargeKey) return null;
    return `/api/image?key=${encodeURIComponent(photo.thumbLargeKey)}`;
  };

  const handleOpenDeleteModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    openDeleteModal();
  };

  const handleOpenLocationModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    setLatitude('');
    setLongitude('');
    openLocationModal();
  };

  const handleUpdateLocation = async () => {
    if (!selectedPhoto || !latitude || !longitude) {
      alert('请输入有效的经纬度');
      return;
    }

    setIsUpdatingLocation(true);
    try {
      await Admin.updatePhotoLocation(
        selectedPhoto.id,
        parseFloat(latitude),
        parseFloat(longitude)
      );

      const updatedPhotos = photos.map(p =>
        p.id === selectedPhoto.id ? { ...p, hasLocation: true } : p
      );
      setPhotos(updatedPhotos);
      updateStats(updatedPhotos);
      filterPhotos(updatedPhotos, activeTab);

      onLocationModalOpenChange(false);
      alert('位置更新成功');
    } catch (error) {
      console.error('Failed to update location:', error);
      alert('位置更新失败');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">图片列表</h2>
        <div className="flex gap-4">
          <Button onPress={() => loadPhotos()} disabled={loading}>
            刷新列表
          </Button>
          <Button
            variant="shadow"
            disabled={loading || stats.missing === 0}
            onPress={openBatchDeleteModal}
          >
            批量删除丢失文件
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="pt-2">
            <p className="text-sm text-gray-600">总图片数</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </CardBody>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardBody className="pt-2">
            <p className="text-sm text-gray-600">文件存在</p>
            <p className="text-3xl font-bold text-green-600">{stats.exists}</p>
          </CardBody>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardBody className="pt-2">
            <p className="text-sm text-gray-600">文件丢失</p>
            <p className="text-3xl font-bold text-red-600">{stats.missing}</p>
          </CardBody>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardBody className="pt-2">
            <p className="text-sm text-gray-600">无地理坐标</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.noLocation}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={key => handleTabChange(key as string)}
            className="mb-4"
          >
            <Tab key="all" title={`全部 (${stats.total})`} />
            <Tab key="missing" title={`文件丢失 (${stats.missing})`} />
            <Tab key="noLocation" title={`无地理坐标 (${stats.noLocation})`} />
          </Tabs>

          <ScrollShadow className="h-[600px]">
            <Table>
              <TableHeader>
                <TableColumn>缩略图</TableColumn>
                <TableColumn>ID</TableColumn>
                <TableColumn>文件名</TableColumn>
                <TableColumn>拍摄时间</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>文件状态</TableColumn>
                <TableColumn>地理坐标</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredPhotos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      暂无图片
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPhotos.map(photo => (
                    <TableRow key={photo.id}>
                      <TableCell>
                        {photo.fileExists && photo.thumbLargeKey ? (
                          <Image
                            src={getThumbnailUrl(photo) || ''}
                            alt={photo.filename}
                            width={80}
                            height={80}
                            className="object-cover rounded"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            无缩略图
                          </div>
                        )}
                      </TableCell>
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
                        <Badge
                          color={photo.hasLocation ? 'success' : 'warning'}
                        >
                          {photo.hasLocation ? '有' : '无'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!photo.hasLocation && (
                            <Button
                              variant="bordered"
                              size="sm"
                              onPress={() => handleOpenLocationModal(photo)}
                            >
                              标记位置
                            </Button>
                          )}
                          <Button
                            variant="shadow"
                            size="sm"
                            onPress={() => handleOpenDeleteModal(photo)}
                          >
                            删除
                          </Button>
                        </div>
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
                <p>
                  将删除图片 &quot;{selectedPhoto?.filename}
                  &quot;，此操作不可恢复。
                </p>
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

      {/* 标记位置 Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onOpenChange={onLocationModalOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                标记位置
              </ModalHeader>
              <ModalBody>
                <p className="mb-4">
                  为图片 &quot;{selectedPhoto?.filename}&quot; 标记地理位置
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      纬度
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="例如: 39.9042"
                      value={latitude}
                      onValueChange={setLatitude}
                      disabled={isUpdatingLocation}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      经度
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="例如: 116.4074"
                      value={longitude}
                      onValueChange={setLongitude}
                      disabled={isUpdatingLocation}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  disabled={isUpdatingLocation}
                >
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                >
                  {isUpdatingLocation ? '更新中...' : '确认标记'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
