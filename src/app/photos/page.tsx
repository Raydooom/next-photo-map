import * as PhotoAction from '@/server/actions/index';
import InfinitePhotoGrid from '@/components/PhotoMasonry/InfinitePhotoGrid';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function DocsPage() {
  const { list, total } = await PhotoAction.getPhotoList({
    page: 1,
    pageSize: 9999,
    // 卡片悬浮信息要展示拍摄地点与参数
    withLocation: true,
    withExif: true,
    // 查看器的拍摄信息面板要展示标签。带上之后面板无需再单独请求详情 ——
    // 除标签外，它需要的字段列表接口已经全部给到
    withAiAnalysis: true
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
