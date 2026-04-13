'use client';

import { motion } from 'framer-motion';
import { MapPin, Sun } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface PhotoGalleryProps {
  className?: string;
}

const photos = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=500&fit=crop',
    filename: 'IMG_3988.JPG',
    location: '北京，中国',
    time: '2小时前',
    aspectRatio: 'tall',
    isLive: false,
    meta: { width: 5712, height: 4284, size: '2.37 MB' }
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
    filename: 'IMG_4012.JPG',
    location: '东京，日本',
    time: '5小时前',
    aspectRatio: 'wide',
    isLive: true,
    meta: { width: 4032, height: 3024, size: '1.85 MB' }
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=400&fit=crop',
    filename: 'IMG_3956.JPG',
    location: '巴黎，法国',
    time: '1天前',
    aspectRatio: 'square',
    isLive: false,
    meta: { width: 4000, height: 4000, size: '2.12 MB' }
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=500&fit=crop',
    filename: 'IMG_3921.JPG',
    location: '迪拜，阿联酋',
    time: '2天前',
    aspectRatio: 'tall',
    isLive: true,
    meta: { width: 5472, height: 3648, size: '3.01 MB' }
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop',
    filename: 'IMG_3890.JPG',
    location: '悉尼，澳大利亚',
    time: '3天前',
    aspectRatio: 'wide',
    isLive: false,
    meta: { width: 6000, height: 4000, size: '2.89 MB' }
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=400&h=400&fit=crop',
    filename: 'IMG_3845.JPG',
    location: '上海，中国',
    time: '4天前',
    aspectRatio: 'square',
    isLive: true,
    meta: { width: 4032, height: 4032, size: '1.95 MB' }
  }
];

export function Recently({ className }: PhotoGalleryProps) {
  return (
    <div className={className || ''}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Recently Captured
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            最近拍摄的精彩瞬间
          </p>
        </div>
        <Link
          href="#"
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          View All
        </Link>
      </div>

      {/* Masonry grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} index={index} />
        ))}
      </div>
    </div>
  );
}

interface PhotoCardProps {
  photo: (typeof photos)[number];
  index: number;
}

function PhotoCard({ photo, index }: PhotoCardProps) {
  const aspectClass = {
    tall: 'aspect-[3/4]',
    wide: 'aspect-[4/3]',
    square: 'aspect-square'
  }[photo.aspectRatio];

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
        {photo.isLive && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <Sun className="size-3 text-amber-400" />
            <span className="text-[10px] font-medium text-white/90">实况</span>
          </div>
        )}

        {/* Image */}
        <Image
          src={photo.src}
          alt={photo.location}
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
                  {photo.location}
                </span>
              </div>
              <span className="text-[10px] text-white/60">{photo.time}</span>
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
          JPG · {photo.meta.width} x {photo.meta.height} · {photo.meta.size}
        </div>
      </div>
    </motion.div>
  );
}
