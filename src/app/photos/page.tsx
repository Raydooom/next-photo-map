import * as PhotoAction from '@/server/actions/index';
import MasonryGrid from './_components/MasonryGrid';
import { Suspense } from 'react';

export default async function DocsPage() {
  const { list } = await PhotoAction.getPhotoList();
  return (
    <div className="min-h-screen p-2">
      <Suspense>
        <MasonryGrid items={list} />
      </Suspense>
    </div>
  );
}
