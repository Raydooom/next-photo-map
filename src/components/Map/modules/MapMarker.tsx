'use client';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibreGl from 'maplibre-gl';

interface MapMarkerProps {
  mapInstance: maplibreGl.Map | null;
  coordinates: [number, number];
  color?: string;
}

export const MapMarker = ({ mapInstance, coordinates, color = '#ef4444' }: MapMarkerProps) => {
  const container = useMemo(() => {
    const el = document.createElement('div');
    el.className = 'custom-marker-container';
    return el;
  }, []);

  const markerRef = useRef<maplibreGl.Marker | null>(null);

  useEffect(() => {
    if (!mapInstance || !markerRef.current) {
      if (mapInstance) {
        const marker = new maplibreGl.Marker({
          element: container,
          color: color
        })
          .setLngLat(coordinates)
          .addTo(mapInstance);

        markerRef.current = marker;
      }
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [mapInstance, coordinates, color, container]);

  return createPortal(
    <div
      className="w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
      style={{ backgroundColor: color }}
    />,
    container
  );
};
