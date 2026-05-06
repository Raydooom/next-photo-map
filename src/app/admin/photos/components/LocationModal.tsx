'use client';
import { useState, useEffect } from 'react';
import { Button } from '@heroui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@heroui/modal';
import { Input } from '@heroui/input';
import { useMapBase, MapMarker } from '@/components/Map';

interface LocationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  photoFilename: string;
  onConfirm: (latitude: number, longitude: number) => void;
  isUpdating: boolean;
}

export function LocationModal({
  isOpen,
  onOpenChange,
  photoFilename,
  onConfirm,
  isUpdating
}: LocationModalProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<[number, number] | null>(
    null
  );

  const { mapRef, mapInstance } = useMapBase({
    config: {
      zoom: 12
    },
    events: {
      onMapLoad: map => {
        map.on('click', e => {
          const lng = e.lngLat.lng;
          const lat = e.lngLat.lat;

          setLongitude(lng.toFixed(6));
          setLatitude(lat.toFixed(6));
          setSelectedMarker([lng, lat]);
        });
      }
    }
  });

  useEffect(() => {
    if (!isOpen) {
      setLatitude('');
      setLongitude('');
      setSelectedMarker(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!latitude || !longitude) return;
    onConfirm(parseFloat(latitude), parseFloat(longitude));
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="full">
      <ModalContent>
        {onClose => (
          <>
            <ModalHeader className="flex flex-col gap-1">标记位置</ModalHeader>
            <ModalBody>
              <p className="mb-4">
                为图片 &quot;{photoFilename}&quot; 标记地理位置
              </p>

              {/* 地图区域 */}
              <div className="mb-4" style={{ height: `calc(100vh - 300px)` }}>
                <div
                  ref={mapRef}
                  className="w-full h-full rounded-lg border-glass overflow-hidden"
                />
                {selectedMarker && (
                  <MapMarker
                    mapInstance={mapInstance}
                    coordinates={selectedMarker}
                    color="#ef4444"
                  />
                )}
              </div>

              {/* 坐标输入 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">纬度</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="例如: 39.9042"
                    value={latitude}
                    onValueChange={setLatitude}
                    disabled={isUpdating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">经度</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="例如: 116.4074"
                    value={longitude}
                    onValueChange={setLongitude}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                disabled={isUpdating}
              >
                取消
              </Button>
              <Button
                color="primary"
                onPress={handleConfirm}
                disabled={isUpdating || !latitude || !longitude}
              >
                {isUpdating ? '更新中...' : '确认标记'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
