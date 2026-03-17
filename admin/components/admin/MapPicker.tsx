'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Ambient Google Maps namespace for TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const libParam = 'places,marker';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      data.key
    )}&language=fi&v=weekly&loading=async&libraries=${libParam}`;
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

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (loc: {
    lat: number;
    lng: number;
    formattedAddress?: string;
    addressComponents?: Array<{ types: string[]; longText?: string; shortText?: string }>;
    geocodeResults?: any[];
  }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const acContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const [ready, setReady] = useState(false);
  const onChangeRef = useRef(onChange);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { latRef.current = lat; lngRef.current = lng; }, [lat, lng]);

  const init = useCallback(async () => {
    await loadMapsApi();
    if (!containerRef.current) return;
    const isTestEnv = typeof (globalThis as any).vi !== 'undefined';
    if (!isTestEnv) {
      const waitForSize = async (el: HTMLElement, tries = 3) => {
        for (let i = 0; i < tries; i++) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return true;
          await new Promise((r) => setTimeout(r, 50));
        }
        return true;
      };
      await waitForSize(containerRef.current);
    }

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

    const fromProps = (typeof latRef.current === 'number' && typeof lngRef.current === 'number')
      ? { lat: latRef.current as number, lng: lngRef.current as number }
      : null;
    const center = fromProps || { lat: 37.98381, lng: 23.727539 };
    const gm = new MapCtor(containerRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      styles: mapStyles,
    });
    mapRef.current = gm;

    let marker: any = null;
    const MarkerCtor: any = (google.maps as any).Marker;
    if (typeof MarkerCtor === 'function') {
      marker = new MarkerCtor({ position: center, map: gm, draggable: true });
    }
    if (!marker) { setReady(true); return; }

    const geocoder: any = (google.maps as any).Geocoder ? new (google.maps as any).Geocoder() : null;
    const reverseGeocodeAndEmit = async (pt: { lat: number; lng: number }) => {
      if (!geocoder) return;
      try {
        const serializeResults = (arr: any[]) => arr?.map((r: any) => ({
          formatted_address: r?.formatted_address,
          place_id: r?.place_id,
          types: Array.isArray(r?.types) ? r.types : undefined,
        })) ?? [];
        const primaryResp = await geocoder.geocode({ location: pt, resultType: ['political'] } as any).catch(() => null);
        const primaryResults: any[] = Array.isArray(primaryResp?.results) ? primaryResp.results : [];
        const usePrimary = primaryResults.length > 0;
        const fallbackResp = usePrimary ? null : await geocoder.geocode({ location: pt } as any).catch(() => null);
        const resp: any = usePrimary ? primaryResp : fallbackResp;
        const results: any[] = Array.isArray(resp?.results) ? resp.results : [];
        const first = results[0];
        
        // Extract address components from the first result
        const addressComponents = Array.isArray(first?.address_components) 
          ? first.address_components.map((comp: any) => ({
              types: Array.isArray(comp?.types) ? comp.types : [],
              longText: comp?.long_name || '',
              shortText: comp?.short_name || '',
            }))
          : [];
        
        onChangeRef.current?.({ 
          ...pt, 
          formattedAddress: first?.formatted_address, 
          addressComponents,
          geocodeResults: serializeResults(results) 
        });
      } catch {}
    };

    const handleDragEnd = () => {
      try {
        const pos = typeof marker.getPosition === 'function' ? marker.getPosition() : marker.position;
        if (!pos) return;
        const latVal = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
        const lngVal = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
        if (typeof latVal === 'number' && typeof lngVal === 'number') {
          const pt = { lat: latVal, lng: lngVal };
          onChangeRef.current?.(pt);
          reverseGeocodeAndEmit(pt);
        }
      } catch {}
    };
    if (typeof marker.addListener === 'function') {
      marker.addListener('dragend', handleDragEnd);
    }

    gm.addListener('click', (e: any) => {
      if (!e.latLng) return;
      if (typeof marker.setPosition === 'function') {
        marker.setPosition(e.latLng);
      } else {
        try { marker.position = e.latLng; } catch {}
      }
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      onChangeRef.current?.(pt);
      reverseGeocodeAndEmit(pt);
    });

    setReady(true);
  }, []);

  useEffect(() => { init(); }, [init]);

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
      <div ref={acContainerRef} className="input" />
      <div ref={containerRef} style={{ width: '100%', height: 360, marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }} />
    </div>
  );
}
