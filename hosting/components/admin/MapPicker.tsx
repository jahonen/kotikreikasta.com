'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

let mapsLoader: Promise<void> | null = null;

const mapStyles: google.maps.MapTypeStyle[] = [
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
    const envMapId = (process as any)?.env?.NEXT_PUBLIC_MAP_ID || (process as any)?.env?.NEXT_PUBLIC_GOOGLE_MAP_ID;
    const libParam = envMapId ? 'places,marker' : 'places';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      data.key
    )}&language=fi&v=weekly&loading=async&libraries=${libParam}`;
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const attemptsRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { latRef.current = lat; lngRef.current = lng; }, [lat, lng]);

  const init = useCallback(async () => {
    await loadMapsApi();
    if (!containerRef.current) {
      try { console.info('[MapPicker] containerRef missing'); } catch {}
      return;
    }
    // Wait until the container has non-zero size (e.g., when step/modal becomes visible)
    const waitForSize = async (el: HTMLElement, tries = 3) => {
      for (let i = 0; i < tries; i++) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return true;
    };
    const isTestEnv = typeof (globalThis as any).vi !== 'undefined';
    if (!isTestEnv) {
      await waitForSize(containerRef.current);
    }
    try {
      const r = containerRef.current.getBoundingClientRect();
      console.info('[MapPicker] container size', { w: r.width, h: r.height });
    } catch {}
    let MapCtor: any = (google.maps as any).Map;
    // Robustly obtain Map constructor: try importLibrary and short polling
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
    if (typeof MapCtor !== 'function') {
      try { console.info('[MapPicker] Map constructor not available'); } catch {}
      return;
    }

    const fromProps = (typeof latRef.current === 'number' && typeof lngRef.current === 'number')
      ? { lat: latRef.current as number, lng: lngRef.current as number }
      : null;
    const center = lastPosRef.current || fromProps || { lat: 37.98381, lng: 23.727539 }; // Athens default
    const mapId: string | undefined = (process as any)?.env?.NEXT_PUBLIC_MAP_ID || (process as any)?.env?.NEXT_PUBLIC_GOOGLE_MAP_ID;
    const gm = new MapCtor(containerRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      styles: mapStyles,
      ...(mapId ? { mapId } : {}),
    });
    mapRef.current = gm;
    try { console.info('[MapPicker] map created'); } catch {}
    // Nudge reflow/resize in case container just became visible
    try {
      if ((google.maps as any).event?.trigger) {
        (google.maps as any).event.trigger(gm, 'resize');
      }
    } catch {}
    try { setTimeout(() => gm.setCenter(center), 0); } catch {}

    // If tiles didn't render yet, attempt a gentle resize (no re-init)
    try {
      setTimeout(() => {
        const hasTiles = !!containerRef.current?.querySelector('.gm-style');
        try { console.info('[MapPicker] gm-style present?', hasTiles); } catch {}
        if (!hasTiles && !interactedRef.current) {
          try {
            if ((google.maps as any).event?.trigger) {
              (google.maps as any).event.trigger(gm, 'resize');
            }
            gm.setCenter(center);
          } catch {}
        }
      }, 500);
    } catch {}

    // Prefer AdvancedMarkerElement when mapId is present; fallback to legacy Marker otherwise (avoids warning)
    let marker: any = null;
    const preferAdvanced = !!mapId;
    if (preferAdvanced && typeof (google.maps as any).importLibrary === 'function') {
      try {
        const markerLib: any = await (google.maps as any).importLibrary('marker');
        const Adv: any = markerLib?.AdvancedMarkerElement;
        if (typeof Adv === 'function') {
          marker = new Adv({ position: center, map: gm, gmpDraggable: true });
        }
      } catch {}
    }
    if (!marker) {
      const MarkerCtor: any = (google.maps as any).Marker;
      if (typeof MarkerCtor === 'function') {
        marker = new MarkerCtor({ position: center, map: gm, draggable: true });
      }
    }
    if (!marker) { try { console.info('[MapPicker] marker not available; continuing without it'); } catch {} setReady(true); return; }
    // Geocoder for reverse lookup when user drags/clicks without a selected Place
    const geocoder: any = (google.maps as any).Geocoder ? new (google.maps as any).Geocoder() : null;
    const reverseGeocodeAndEmit = async (pt: { lat: number; lng: number }) => {
      if (!geocoder) return;
      try {
        const toLatLng = (ll: any) => {
          if (!ll) return undefined;
          if (typeof ll.lat === 'function' && typeof ll.lng === 'function') {
            return { lat: ll.lat(), lng: ll.lng() };
          }
          if (typeof ll.lat === 'number' && typeof ll.lng === 'number') {
            return { lat: ll.lat, lng: ll.lng };
          }
          return undefined;
        };
        const toBounds = (b: any) => {
          if (!b) return undefined;
          if (typeof b.getSouthWest === 'function' && typeof b.getNorthEast === 'function') {
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            return { south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() };
          }
          if (typeof b.south === 'number' && typeof b.west === 'number' && typeof b.north === 'number' && typeof b.east === 'number') {
            return { south: b.south, west: b.west, north: b.north, east: b.east };
          }
          return undefined;
        };
        const serializeResults = (arr: any[]) =>
          arr?.map((r: any) => ({
            formatted_address: r?.formatted_address,
            place_id: r?.place_id,
            types: Array.isArray(r?.types) ? r.types : undefined,
            partial_match: r?.partial_match,
            address_components: Array.isArray(r?.address_components)
              ? r.address_components.map((c: any) => ({
                  long_name: c?.long_name,
                  short_name: c?.short_name,
                  types: Array.isArray(c?.types) ? c.types : undefined,
                }))
              : undefined,
            geometry: r?.geometry
              ? {
                  location: toLatLng(r.geometry.location),
                  location_type: r.geometry.location_type,
                  viewport: toBounds(r.geometry.viewport),
                  bounds: toBounds(r.geometry.bounds),
                }
              : undefined,
          })) ?? [];
        // Prefer political results to surface admin levels for region/island; fall back to general if needed
        const primaryResp = await geocoder.geocode({ location: pt, resultType: ['political'] } as any).catch(() => null);
        const primaryResults: any[] = Array.isArray(primaryResp?.results) ? primaryResp.results : [];
        const usePrimary = primaryResults.length > 0;
        const fallbackResp = usePrimary ? null : await geocoder.geocode({ location: pt } as any).catch(() => null);
        const resp: any = usePrimary ? primaryResp : fallbackResp;
        const results: any[] = Array.isArray(resp?.results) ? resp.results : [];

        // Merge address components from all results to capture admin levels even if not in the first result
        const compMap = new Map<string, { types: string[]; longText?: string; shortText?: string }>();
        for (const res of results) {
          const acs: any[] = Array.isArray(res.address_components) ? res.address_components : [];
          for (const c of acs) {
            const types: string[] = Array.isArray(c?.types) ? c.types : [];
            const key = `${(c?.long_name || c?.short_name || '').toLowerCase()}|${types.sort().join(',')}`;
            if (!compMap.has(key)) {
              compMap.set(key, {
                types,
                longText: c?.long_name,
                shortText: c?.short_name,
              });
            }
          }
        }
        const merged = Array.from(compMap.values());
        const first = results[0];
        const safeResults = serializeResults(results);
        onChangeRef.current?.({ ...pt, formattedAddress: first?.formatted_address, addressComponents: merged, geocodeResults: safeResults });
        try { console.info('[MapPicker] geocode', first?.formatted_address || '(no formatted address)'); } catch {}
      } catch {}
    };
    try {
      const handleDragEnd = () => {
        try {
          const pos = typeof marker.getPosition === 'function' ? marker.getPosition() : marker.position;
          if (!pos) return;
          const latVal = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
          const lngVal = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
          if (typeof latVal === 'number' && typeof lngVal === 'number') {
            lastPosRef.current = { lat: latVal, lng: lngVal };
            interactedRef.current = true;
            const pt = { lat: latVal, lng: lngVal };
            onChangeRef.current?.(pt);
            reverseGeocodeAndEmit(pt);
          }
        } catch {}
      };
      if (typeof marker.addListener === 'function') {
        marker.addListener('dragend', handleDragEnd);
      } else if ((google.maps as any).event?.addListener) {
        (google.maps as any).event.addListener(marker, 'dragend', handleDragEnd);
      }
      if (typeof marker.addEventListener === 'function') {
        try { marker.addEventListener('gmp-dragend', handleDragEnd as any); } catch {}
        try { marker.addEventListener('dragend', handleDragEnd as any); } catch {}
      }
    } catch {}
    markerRef.current = marker;

    gm.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      if (typeof marker.setPosition === 'function') {
        marker.setPosition(e.latLng);
      } else {
        try { marker.position = e.latLng; } catch {}
      }
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      lastPosRef.current = pt;
      interactedRef.current = true;
      onChangeRef.current?.(pt);
      reverseGeocodeAndEmit(pt);
    });

    // Places API (New): attempt to use PlaceAutocompleteElement once 'places' library is available via libraries param.
    try {
      const waitForPlaces = async (tries = 20) => {
        for (let i = 0; i < tries; i++) {
          if ((google.maps as any).places?.PlaceAutocompleteElement) return true;
          await new Promise((r) => setTimeout(r, 100));
        }
        return false;
      };
      const ready = await waitForPlaces();
      if (ready && acContainerRef.current) {
        let placeAutocomplete: any = null;
        const PACtor: any = (google.maps as any).places?.PlaceAutocompleteElement;
        if (typeof PACtor === 'function') {
          try { placeAutocomplete = new PACtor(); } catch {}
        }
        if (!placeAutocomplete) {
          try { placeAutocomplete = document.createElement('gmpx-place-autocomplete'); } catch {}
        }
        if (!placeAutocomplete) {
          setReady(true);
          return;
        }
        try { (placeAutocomplete as any).componentRestrictions = { country: ['gr'] }; } catch {}
        if (gm.getBounds()) {
          (placeAutocomplete as any).locationBias = gm.getBounds();
        }
        acContainerRef.current.innerHTML = '';
        acContainerRef.current.appendChild(placeAutocomplete as unknown as Node);
        const handler = async (ev: any) => {
          try {
            const detail = ev?.detail ?? ev;
            const prediction = detail?.placePrediction || detail?.prediction;
            let place: any = detail?.place ?? null;
            if (!place && prediction && typeof prediction.toPlace === 'function') {
              place = prediction.toPlace();
            }
            if (!place && (placeAutocomplete as any)?.value) {
              const v: any = (placeAutocomplete as any).value;
              place = v?.place ?? (typeof v?.toPlace === 'function' ? v.toPlace() : null);
            }
            // If no place object, try getting a direct latLng from the event detail
            let directPt: { lat: number; lng: number } | null = null;
            const dl = detail?.latLng || detail?.location || detail?.position || detail?.geometry?.location;
            if (dl) {
              if (typeof dl.lat === 'function' && typeof dl.lng === 'function') {
                directPt = { lat: dl.lat(), lng: dl.lng() };
              } else if (typeof dl.lat === 'number' && typeof dl.lng === 'number') {
                directPt = { lat: dl.lat, lng: dl.lng };
              }
            }
            if (!place && directPt) {
              gm.setCenter(directPt);
              gm.setZoom(14);
              if (typeof marker.setPosition === 'function') marker.setPosition(directPt); else { try { marker.position = directPt; } catch {} }
              lastPosRef.current = directPt;
              interactedRef.current = true;
              onChangeRef.current?.({ ...directPt });
              reverseGeocodeAndEmit(directPt);
              return;
            }
            if (!place) return;
            if (typeof place.fetchFields === 'function') {
              await place.fetchFields({ fields: ['location', 'addressComponents', 'formattedAddress'] });
            }
            const loc: any = (place as any).location;
            const formattedAddress: string | undefined = (place as any).formattedAddress;
            const ac: any[] | undefined = (place as any).addressComponents as any[] | undefined;
            let pt: { lat: number; lng: number } | null = null;
            if (loc) {
              if (typeof loc.lat === 'function' && typeof loc.lng === 'function') {
                pt = { lat: loc.lat(), lng: loc.lng() };
              } else if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                pt = { lat: loc.lat, lng: loc.lng };
              }
            }
            if (pt) {
              gm.setCenter(pt);
              gm.setZoom(14);
              if (typeof marker.setPosition === 'function') {
                marker.setPosition(pt);
              } else {
                try { marker.position = pt; } catch {}
              }
              lastPosRef.current = pt;
              interactedRef.current = true;
              onChangeRef.current?.({
                ...pt,
                formattedAddress,
                addressComponents: ac?.map((c: any) => ({
                  types: c?.types ?? [],
                  longText: c?.longText,
                  shortText: c?.shortText,
                })),
              });
              try { await reverseGeocodeAndEmit(pt); } catch {}
            }
          } catch {}
        };
        try { placeAutocomplete.addEventListener('gmp-select', handler); } catch {}
        try { placeAutocomplete.addEventListener('gmp-placeselect', handler); } catch {}
        try { placeAutocomplete.addEventListener('gmp-place-select', handler); } catch {}
        try { placeAutocomplete.addEventListener('gmpx-place-select', handler); } catch {}
        try { placeAutocomplete.addEventListener('gmpx-placechange', handler); } catch {}
      }
    } catch {
      // keep map functional if places element not available
    }

    setReady(true);
    try { console.info('[MapPicker] ready'); } catch {}
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  // On window resize, re-trigger map layout/center if initialized
  useEffect(() => {
    const onResize = () => {
      try {
        const gm = mapRef.current as any;
        if (!gm) return;
        if ((google.maps as any).event?.trigger) {
          (google.maps as any).event.trigger(gm, 'resize');
        }
        // Preserve current center if set, else keep props-based default
        const c = gm.getCenter?.();
        if (c) gm.setCenter(c);
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
