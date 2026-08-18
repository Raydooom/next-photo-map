import * as PhotoAction from '@/server/actions/index';
import InfinitePhotoGrid from '@/components/PhotoMasonry/InfinitePhotoGrid';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function DocsPage() {
  const { list, total } = await PhotoAction.getPhotoList({
    page: 1,
    pageSize: PAGE_SIZE,
    // 卡片悬浮信息要展示拍摄地点与参数
    withLocation: true,
    withExif: true
  });

  return (
    <div className="relative min-h-screen mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      <Suspense>
        <InfinitePhotoGrid
          initialItems={list}
          total={total}
          pageSize={PAGE_SIZE}
          targetRowHeight={300}
        />
      </Suspense>
    </div>
  );
}
