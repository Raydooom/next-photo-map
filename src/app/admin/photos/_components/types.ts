import { PhotoItem } from '@/types';

export type Photo = {
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
} & Partial<PhotoItem>;

export type PhotoStats = {
  total: number;
  exists: number;
  missing: number;
  noLocation: number;
  top: number;
};

export type FilterTab = 'all' | 'exists' | 'missing' | 'no-location' | 'top';
