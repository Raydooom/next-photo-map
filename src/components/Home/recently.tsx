'use client';

import { PhotoItem } from '@/types';
import { motion } from 'framer-motion';
import { MapPin, Sun } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';

interface PhotoGalleryProps {
  className?: string;
  photos: PhotoItem[];
}

export function Recently({
  photos: recentlyPhotos,
  className = ''
}: PhotoGalleryProps) {
  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Recently Captured
          </h2>
          <p className="mt-1 text-muted-foreground">最近拍摄的精彩瞬间</p>
        </div>
        <Link
          href="/photos"
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          查看所有
        </Link>
      </div>

      {/* Masonry grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {recentlyPhotos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} index={index} />
        ))}
      </div>
    </section>
  );
}

interface PhotoCardProps {
  photo: PhotoItem;
  index: number;
}

function PhotoCard({ photo, index }: PhotoCardProps) {
  const aspectClass = {
    tall: 'aspect-[3/4]',
    wide: 'aspect-[4/3]',
    square: 'aspect-square'
  }[photo.width > photo.height ? 'wide' : 'tall'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group mb-4 break-inside-avoid overflow-hidden rounded-xl border border-background/60 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Image container */}
      <div className={`relative overflow-hidden ${aspectClass}`}>
        {/* Live photo indicator */}
        {photo.videoUrl && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <Sun className="size-3 text-amber-400" />
            <span className="text-[10px] font-medium text-white/90">实况</span>
          </div>
        )}

        {/* Image */}
        <Image
          src={photo.thumbLargeUrl}
          alt={photo.filename}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Hover overlay with location */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="w-full p-3">
            <div className="flex items-center justify-between rounded-lg bg-black/50 px-3 py-2 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-primary" />
                <span className="text-xs font-medium text-white/90">
                  {photo.locations?.neighborhood || photo.locations?.township}
                </span>
              </div>
              <span className="text-[10px] text-white/60">
                {dayjs(photo.takenAt).format('YYYY/MM/DD HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filename and meta info */}
      <div className="border-t border-border/40 p-2.5">
        <div className="text-sm font-medium text-foreground">
          {photo.filename}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          JPG · {photo.width} x {photo.height}
        </div>
      </div>
    </motion.div>
  );
}
