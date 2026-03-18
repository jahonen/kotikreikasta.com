'use client';

import { useEffect, useRef, useState } from 'react';

declare const google: any;

let mapsLoader: Promise<void> | null = null;

const mapStyles: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#ebe3cd' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9b2a6' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', elementType: 'geometry.stroke', stylers: [{ color: '#dcd2be' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#ae9e90' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#93817c' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#a5b076' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#447530' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f1e6' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fdfcf8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f8c967' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e9bc62' }] },
  { featureType: 'road.highway', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#e98d58' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry.stroke', stylers: [{ color: '#db8555' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#806b63' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
  { featureType: 'transit.line', elementType: 'labels.text.fill', stylers: [{ color: '#8f7d77' }] },
  { featureType: 'transit.line', elementType: 'labels.text.stroke', stylers: [{ color: '#ebe3cd' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#dfd2ae' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#b9d3c2' }] },
  { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#92998d' }] },
];

async function loadMapsApi(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).google?.maps) return;
  if (mapsLoader) return mapsLoader;
  mapsLoader = (async () => {
    const res = await fetch('/api/maps/key', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load Maps key: ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    if (!data?.key) throw new Error('MAPS key missing');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      data.key
    )}&language=fi&v=weekly&loading=async`;
    script.async = true;
    const p = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Maps JS'));
    });
    document.head.appendChild(script);
    await p;
  })();
  return mapsLoader;
}

export default function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadMapsApi();
      if (!containerRef.current) return;

      const waitForSize = async (el: HTMLElement, tries = 3) => {
        for (let i = 0; i < tries; i++) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return true;
          await new Promise((r) => setTimeout(r, 50));
        }
        return true;
      };
      await waitForSize(containerRef.current);

      let MapCtor: any = (google.maps as any).Map;
      for (let i = 0; typeof MapCtor !== 'function' && i < 10; i++) {
        if (typeof (google.maps as any).importLibrary === 'function') {
          try {
            const mapsLib: any = await (google.maps as any).importLibrary('maps');
            MapCtor = mapsLib?.Map ?? MapCtor;
          } catch {}
        }
        if (typeof MapCtor === 'function') break;
        await new Promise((r) => setTimeout(r, 100));
        MapCtor = (google.maps as any).Map;
      }
      if (typeof MapCtor !== 'function') return;

      const roundedLat = Math.round(lat * 100) / 100;
      const roundedLng = Math.round(lng * 100) / 100;
      const center = { lat: roundedLat, lng: roundedLng };

      const gm = new MapCtor(containerRef.current, {
        center,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        styles: mapStyles,
      });

      const MarkerCtor: any = (google.maps as any).Marker;
      if (typeof MarkerCtor === 'function') {
        new MarkerCtor({ position: center, map: gm });
      }

      setReady(true);
    };

    init();
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 360,
        borderRadius: 4,
        overflow: 'hidden',
        border: '0.5px solid var(--border)',
        background: 'var(--sand)',
      }}
    />
  );
}
