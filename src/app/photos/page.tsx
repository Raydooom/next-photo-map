import * as PhotoAction from '@/server/actions/index';
import MasonryGrid from '@/components/PhotoMasonry/MasonryGrid';
import { Suspense } from 'react';
export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const { list } = await PhotoAction.getPhotoList();
  return (
    <div className="min-h-screen px-6 py-6 md:px-8 md:py-8">
      <Suspense>
        <MasonryGrid items={list} columns={5} />
      </Suspense>
    </div>
  );
}
