import * as PhotoAction from '@/server/actions/index';
import InfinitePhotoGrid from '@/components/PhotoMasonry/InfinitePhotoGrid';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function DocsPage() {
  const { list, total } = await PhotoAction.getPhotoList({
    page: 1,
    pageSize: PAGE_SIZE
  });

  return (
    <div className="min-h-screen px-6 py-6 md:px-8 md:py-8">
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
