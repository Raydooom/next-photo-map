'use client';

import { useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { useDisclosure } from '@heroui/modal';
import {
  Photo,
  PhotosToolbar,
  PhotosFilterTabs,
  PhotosTable,
  ConfirmModal,
  LocationModal
} from './_components';
import { usePhotosManagement } from './_hooks';

export default function PhotosManagementPage() {
  const {
    filteredPhotos,
    stats,
    loading,
    activeTab,
    setActiveTab,
    loadPhotos,
    deletePhoto,
    deleteMissingPhotos,
    updateLocation,
    deleteLocation,
    toggleTop,
    analyzePhoto
  } = usePhotosManagement();

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Modal 控制
  const deleteModal = useDisclosure();
  const batchDeleteModal = useDisclosure();
  const locationModal = useDisclosure();
  const deleteLocationModal = useDisclosure();

  // ============ 事件处理 ============

  const handleOpenDelete = (photo: Photo) => {
    setSelectedPhoto(photo);
    deleteModal.onOpen();
  };

  const handleOpenMarkLocation = (photo: Photo) => {
    setSelectedPhoto(photo);
    locationModal.onOpen();
  };

  const handleOpenDeleteLocation = (photo: Photo) => {
    setSelectedPhoto(photo);
    deleteLocationModal.onOpen();
  };

  const handleConfirmUpdateLocation = async (lat: number, lng: number) => {
    if (!selectedPhoto) return;
    setIsUpdatingLocation(true);
    try {
      await updateLocation(selectedPhoto.id, lat, lng);
    } finally {
      setIsUpdatingLocation(false);
      locationModal.onOpenChange();
    }
  };

  return (
    <div className="space-y-6">
      <PhotosToolbar
        stats={stats}
        onRefresh={loadPhotos}
        onCleanMissing={batchDeleteModal.onOpen}
      />

      <Card>
        <CardBody className="p-3">
          <PhotosFilterTabs
            stats={stats}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <PhotosTable
            photos={filteredPhotos}
            loading={loading}
            onMarkLocation={handleOpenMarkLocation}
            onDeleteLocation={handleOpenDeleteLocation}
            onToggleTop={toggleTop}
            onDelete={handleOpenDelete}
            onAnalyze={analyzePhoto}
          />
        </CardBody>
      </Card>

      {/* 删除单张图片 */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onOpenChange={deleteModal.onOpenChange}
        title="确认删除"
        message={
          <>
            将删除图片 &quot;{selectedPhoto?.filename}&quot;，此操作不可恢复。
          </>
        }
        confirmText="确认删除"
        onConfirm={() => selectedPhoto && deletePhoto(selectedPhoto.id)}
      />

      {/* 批量删除丢失文件 */}
      <ConfirmModal
        isOpen={batchDeleteModal.isOpen}
        onOpenChange={batchDeleteModal.onOpenChange}
        title="确认批量删除"
        message={
          <>将删除 {stats.missing} 个文件已丢失的图片记录，此操作不可恢复。</>
        }
        confirmText="确认删除"
        onConfirm={deleteMissingPhotos}
      />

      {/* 删除位置 */}
      <ConfirmModal
        isOpen={deleteLocationModal.isOpen}
        onOpenChange={deleteLocationModal.onOpenChange}
        title="确认删除位置"
        message={
          <>
            将删除图片 &quot;{selectedPhoto?.filename}&quot;
            的地理位置信息，此操作不可恢复。
          </>
        }
        confirmText="确认删除"
        onConfirm={() => selectedPhoto && deleteLocation(selectedPhoto.id)}
      />

      {/* 标记位置 */}
      <LocationModal
        isOpen={locationModal.isOpen}
        onOpenChange={locationModal.onOpenChange}
        photoFilename={selectedPhoto?.filename || ''}
        onConfirm={handleConfirmUpdateLocation}
        isUpdating={isUpdatingLocation}
      />
    </div>
  );
}
