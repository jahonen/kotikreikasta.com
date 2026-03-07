'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

let mapsLoader: Promise<void> | null = null;

async function loadMapsApi(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).google?.maps) return;
  if (mapsLoader) return mapsLoader;
  mapsLoader = (async () => {
    const res = await fetch('/api/maps/key', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.key) throw new Error('MAPS key missing');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.key)}&libraries=places&language=fi`; 
    script.async = true;
    const p = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Failed to load Maps JS'));
    });
    document.head.appendChild(script);
    await p;
  })();
  return mapsLoader;
}

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    await loadMapsApi();
    if (!containerRef.current) return;

    const center = { lat: lat ?? 37.98381, lng: lng ?? 23.727539 }; // Athens default
    const gm = new google.maps.Map(containerRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
    });
    mapRef.current = gm;

    const marker = new google.maps.Marker({
      position: center,
      map: gm,
      draggable: true,
    });
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
    });
    markerRef.current = marker;

    gm.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    if (searchRef.current) {
      const ac = new google.maps.places.Autocomplete(searchRef.current as HTMLInputElement, {
        fields: ['geometry', 'name'] as any,
        componentRestrictions: { country: ['gr'] },
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const loc = place?.geometry?.location;
        if (loc) {
          const pt = { lat: loc.lat(), lng: loc.lng() };
          gm.setCenter(pt);
          gm.setZoom(14);
          marker.setPosition(pt);
          onChange(pt);
        }
      });
    }

    setReady(true);
  }, [lat, lng, onChange]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!ready || !mapRef.current || !markerRef.current) return;
    if (typeof lat === 'number' && typeof lng === 'number') {
      const pt = { lat, lng };
      mapRef.current.setCenter(pt);
      markerRef.current.setPosition(pt);
    }
  }, [ready, lat, lng]);

  return (
    <div>
      <input ref={searchRef} className="input" placeholder="Hae sijaintia (kaupunki, osoite)" />
      <div ref={containerRef} style={{ width: '100%', height: 360, marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }} />
    </div>
  );
}
