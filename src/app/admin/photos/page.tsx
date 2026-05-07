'use client';
import { useState, useEffect } from 'react';
import * as Admin from '@/server/actions/admin';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
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
import { LocationModal } from './components/LocationModal';
import { formatDateCN } from '@/utils/format';

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
  top?: boolean;
}

export default function PhotosManagementPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    exists: 0,
    missing: 0,
    noLocation: 0,
    top: 0
  });
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeTab, setActiveTab] = useState('all');
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

  const {
    isOpen: isDeleteLocationModalOpen,
    onOpen: openDeleteLocationModal,
    onOpenChange: onDeleteLocationModalOpenChange
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
        fileExists: p.fileExists,
        createdAt: p.createdAt.toISOString(),
        hasLocation: Boolean(p.locations) || false,
        top: p.top || false
      }));
      setPhotos(formattedPhotos);
      setFilteredPhotos(formattedPhotos);
      calculateStats(formattedPhotos);
    } catch (error) {
      console.error('加载图片失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (photoList: Photo[]) => {
    const total = photoList.length;
    const exists = photoList.filter(p => p.fileExists).length;
    const missing = photoList.filter(p => !p.fileExists).length;
    const noLocation = photoList.filter(p => !p.hasLocation).length;
    const top = photoList.filter(p => p.top).length;
    setStats({ total, exists, missing, noLocation, top });
  };

  const filterPhotos = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case 'all':
        setFilteredPhotos(photos);
        break;
      case 'exists':
        setFilteredPhotos(photos.filter(p => p.fileExists));
        break;
      case 'missing':
        setFilteredPhotos(photos.filter(p => !p.fileExists));
        break;
      case 'no-location':
        setFilteredPhotos(photos.filter(p => !p.hasLocation));
        break;
      case 'top':
        setFilteredPhotos(photos.filter(p => p.top));
        break;
      default:
        setFilteredPhotos(photos);
    }
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
    openLocationModal();
  };

  const handleOpenDeleteLocationModal = (photo: Photo) => {
    setSelectedPhoto(photo);
    openDeleteLocationModal();
  };

  const handleDeleteLocation = async () => {
    if (!selectedPhoto) return;
    try {
      await Admin.deletePhotoLocation(selectedPhoto.id);
      setPhotos(prev =>
        prev.map(p =>
          p.id === selectedPhoto.id ? { ...p, hasLocation: false } : p
        )
      );
    } catch (error) {
      console.error('删除位置失败:', error);
    }
    onDeleteLocationModalOpenChange();
  };

  const handleUpdateTop = async (photo: Photo) => {
    try {
      await Admin.updatePhotoTop(photo.id, !photo.top);
      setPhotos(prev =>
        prev.map(p => (p.id === photo.id ? { ...p, top: !p.top } : p))
      );
    } catch (error) {
      console.error('更新置顶状态失败:', error);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    filterPhotos(activeTab);
    calculateStats(photos);
  }, [activeTab, photos]);

  const handleDeletePhoto = async () => {
    if (!selectedPhoto) return;
    try {
      await Admin.deletePhoto(selectedPhoto.id);
      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
    } catch (error) {
      console.error('删除失败:', error);
    }
    onDeleteModalOpenChange();
  };

  const handleDeleteMissingPhotos = async () => {
    try {
      await Admin.deleteMissingPhotos();
      loadPhotos();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
    onBatchDeleteModalOpenChange();
  };

  const handleUpdateLocation = async (latitude: number, longitude: number) => {
    if (!selectedPhoto) return;

    setIsUpdatingLocation(true);
    try {
      await Admin.updatePhotoLocation(selectedPhoto.id, latitude, longitude);
      setPhotos(prev =>
        prev.map(p =>
          p.id === selectedPhoto.id ? { ...p, hasLocation: true } : p
        )
      );
    } catch (error) {
      console.error('更新位置失败:', error);
    } finally {
      setIsUpdatingLocation(false);
      onLocationModalOpenChange();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">图片管理</h2>
        <div className="flex gap-3">
          <Button onPress={loadPhotos} size="sm">
            刷新列表
          </Button>
          <Button
            color="danger"
            variant="flat"
            size="sm"
            onPress={openBatchDeleteModal}
            disabled={stats.missing === 0}
          >
            清理丢失文件 ({stats.missing})
          </Button>
        </div>
      </div>

      <Card>
        <CardBody className="p-3">
          <Tabs
            aria-label="照片过滤"
            selectedKey={activeTab}
            onSelectionChange={key => filterPhotos(key as string)}
            className="mb-4"
          >
            <Tab key="all" title={`全部(${stats.total})`} />
            <Tab key="exists" title={`文件存在(${stats.exists})`} />
            <Tab key="missing" title={`文件丢失(${stats.missing})`} />
            <Tab key="no-location" title={`文件无坐标(${stats.noLocation})`} />
            <Tab key="top" title={`已置顶(${stats.top})`} />
          </Tabs>
          <ScrollShadow className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableColumn>缩略图</TableColumn>
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
                    <TableCell colSpan={7} className="text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredPhotos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
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
                            className="object-cover max-w-[50px] max-h-[50px] rounded-lg"
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
                      <TableCell>{formatDateCN(photo.takenAt)}</TableCell>
                      <TableCell>{formatDateCN(photo.createdAt)}</TableCell>
                      <TableCell>
                        <Badge color={photo.fileExists ? 'success' : 'danger'}>
                          {photo.fileExists ? '存在' : '丢失'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!photo.hasLocation ? (
                            <Button
                              variant="flat"
                              size="sm"
                              onPress={() => handleOpenLocationModal(photo)}
                            >
                              标记位置
                            </Button>
                          ) : (
                            <Button
                              color="warning"
                              variant="flat"
                              size="sm"
                              onPress={() =>
                                handleOpenDeleteLocationModal(photo)
                              }
                            >
                              删除位置
                            </Button>
                          )}
                          <Button
                            color={photo.top ? 'primary' : 'secondary'}
                            variant="flat"
                            size="sm"
                            onPress={() => handleUpdateTop(photo)}
                          >
                            {photo.top ? '取消置顶' : '置顶'}
                          </Button>
                          <Button
                            variant="flat"
                            color="danger"
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

      {/* 删除位置 Modal */}
      <Modal
        isOpen={isDeleteLocationModalOpen}
        onOpenChange={onDeleteLocationModalOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                确认删除位置
              </ModalHeader>
              <ModalBody>
                <p>
                  将删除图片 &quot;{selectedPhoto?.filename}
                  &quot; 的地理位置信息，此操作不可恢复。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={handleDeleteLocation}>
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 标记位置 Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onOpenChange={onLocationModalOpenChange}
        photoFilename={selectedPhoto?.filename || ''}
        onConfirm={handleUpdateLocation}
        isUpdating={isUpdatingLocation}
      />
    </div>
  );
}
