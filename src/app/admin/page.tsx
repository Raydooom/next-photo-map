'use client';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Tabs, Tab } from '@heroui/tabs';
import { Button } from '@heroui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import * as Admin from '@/server/actions/admin';

export default function AdminOverviewPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalPhotos: 0,
    photosWithLocation: 0,
    missingFiles: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const photos = await Admin.getPhotosWithFileStatus();
        const total = photos.length;
        const withLocation = photos.filter(
          (p: any) => !!(p.photoExif?.latitude && p.photoExif?.longitude)
        ).length;
        const missing = photos.filter(
          (p: any) => !(p as any).fileExists
        ).length;

        setStats({
          totalPhotos: total,
          photosWithLocation: withLocation,
          missingFiles: missing
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">图片总数</h3>
            </CardHeader>
            <CardBody>
              <p className="text-4xl font-bold text-blue-600">
                {loading ? '-' : stats.totalPhotos}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">无地理坐标图片</h3>
            </CardHeader>
            <CardBody>
              <p className="text-4xl font-bold text-yellow-600">
                {loading ? '-' : stats.totalPhotos - stats.photosWithLocation}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">文件丢失</h3>
            </CardHeader>
            <CardBody>
              <p className="text-4xl font-bold text-red-600">
                {loading ? '-' : stats.missingFiles}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">快捷操作</h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4">
                <Link href="/admin/photos">
                  <Button className="w-full" variant="bordered">
                    管理图片
                  </Button>
                </Link>
                <Link href="/admin/scan">
                  <Button className="w-full" variant="bordered">
                    扫描图片
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">系统信息</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">版本</span>
                  <span>1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">环境</span>
                  <span>Production</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
