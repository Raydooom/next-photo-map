import * as PhotoAction from '@/server/actions/index';
import MasonryGrid from '@/components/PhotoMasonry/MasonryGrid';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const { list } = await PhotoAction.getPhotoList();
  return (
    <div className="min-h-screen px-4">
      <Suspense>
        <MasonryGrid items={list} />
      </Suspense>
    </div>
  );
}
