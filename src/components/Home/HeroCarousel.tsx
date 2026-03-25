'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import { PhotoDetail, PhotoItem } from '@/types';
import Image from 'next/image';
import { Button } from '@heroui/button';
import Link from 'next/link';
import { Mail, MapPin } from 'lucide-react';
import { EmblaCarouselType } from 'embla-carousel';
import {
  formatExposureTime,
  formatFNumber,
  formatFocalLength,
  formatIso,
  formatLatLng
} from '@/utils/format';

interface HeroCarouselProps {
  items: PhotoDetail[];
}

export default function HeroCarousel({ items }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      duration: 30
    },
    [Autoplay({ delay: 5000 }), Fade()]
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback((api: EmblaCarouselType) => {
    setActiveIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const currentItem = items[activeIndex] || items[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Carousel */}
      <div className="absolute inset-0 z-0" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {items.map(item => (
            <div
              key={item.id}
              className="relative flex-[0_0_100%] w-full h-full"
            >
              <Image
                src={item.largeThumbnail}
                alt={item.filename}
                fill
                priority
                className="object-cover"
                quality={90}
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-12 lg:p-20">
        {/* Top Spacer (for Navbar) */}
        <div className="h-20" />

        {/* Main Text */}
        <div className="max-w-4xl space-y-6">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            <div>CAPTURING</div>
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              EPHEMERAL
              <span className="text-white"> LIGHT</span>
            </div>
          </h1>

          {/* EXIF & Location Info */}
          {currentItem?.exif && (
            <div className="flex flex-col gap-2 text-gray-300">
              <div className="flex items-center gap-4 text-sm md:text-base font-mono">
                <>
                  <span>{formatFNumber(currentItem.exif.fNumber)}</span>
                  <span>
                    {formatExposureTime(currentItem.exif.exposureTime)}
                  </span>
                  <span>ISO {formatIso(currentItem.exif.iso)}</span>
                  <span>{formatFocalLength(currentItem.exif.focalLength)}</span>
                </>
              </div>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <MapPin size={18} className="text-blue-400" />
                <span>
                  {formatLatLng(currentItem.exif) || 'Location Unknown'}
                </span>
              </div>
            </div>
          )}
          <div className="pt-4">
            <Button
              as={Link}
              href={`/footprint?photoId=${currentItem.id}`}
              color="primary"
              size="lg"
              radius="full"
              className="font-semibold px-8"
            >
              View on Map &rarr;
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-end justify-between w-full">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-black bg-gray-200"
                />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-xs text-white font-medium">
                +12k
              </div>
            </div>
            <span className="text-sm text-gray-400 font-medium">
              Trusted by global brands
            </span>
          </div>

          <div className="hidden md:block">
            <Button
              isIconOnly
              radius="full"
              variant="flat"
              className="bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
            >
              <Mail size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
