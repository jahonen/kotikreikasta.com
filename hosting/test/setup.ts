import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock fetch to avoid network during Maps key load
(global as any).fetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({ key: 'test-browser-key' }),
})) as any;

// Ensure any script tag appended by loader triggers onload quickly in tests
const realCreateElement = document.createElement.bind(document);
// @ts-ignore
document.createElement = ((tagName: any, options?: any) => {
  const el = realCreateElement(tagName, options) as any;
  if (tagName?.toString?.().toLowerCase() === 'script') {
    setTimeout(() => {
      if (typeof el.onload === 'function') el.onload(new Event('load'));
    }, 0);
  }
  return el;
}) as any;

// Basic google maps + places mocks
// Minimal LatLng-like helper
function latLngFrom(pos: any) {
  if (!pos) return null;
  if (typeof pos.lat === 'function' && typeof pos.lng === 'function') return pos;
  if (typeof pos.lat === 'number' && typeof pos.lng === 'number') {
    return {
      lat: () => pos.lat,
      lng: () => pos.lng,
    };
  }
  return null;
}

class MockMap {
  _el: any;
  _opts: any;
  _listeners: Record<string, Function[]> = {};
  _center: { lat: number; lng: number };
  constructor(el: any, opts: any) {
    this._el = el;
    this._opts = opts || {};
    this._center = opts?.center || { lat: 0, lng: 0 };
    (globalThis as any).__lastMapInstance = this;
  }
  addListener(ev: string, cb: Function) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(cb);
    return { remove: () => {} };
  }
  trigger(ev: string, payload: any) {
    (this._listeners[ev] || []).forEach((cb) => cb(payload));
  }
  setCenter(pt: { lat: number; lng: number }) {
    this._center = pt;
  }
  setZoom(_z: number) {}
  getBounds() {
    return { toJSON: () => ({}) } as any;
  }
}

class MockMarker {
  _pos: { lat: number; lng: number };
  _listeners: Record<string, Function[]> = {};
  constructor(opts: any) {
    const ll = latLngFrom(opts?.position);
    if (ll) {
      this._pos = { lat: ll.lat(), lng: ll.lng() };
    } else if (opts?.position && typeof opts.position.lat === 'number' && typeof opts.position.lng === 'number') {
      this._pos = opts.position;
    } else {
      this._pos = { lat: 0, lng: 0 };
    }
    (globalThis as any).__lastMarkerInstance = this;
  }
  addListener(ev: string, cb: Function) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(cb);
    return { remove: () => {} };
  }
  trigger(ev: string) {
    const payload = ev === 'dragend' ? { latLng: latLngFrom(this._pos) } : undefined;
    (this._listeners[ev] || []).forEach((cb) => cb(payload));
  }
  getPosition() {
    const p = this._pos;
    return latLngFrom(p);
  }
  setPosition(p: any) {
    const ll = latLngFrom(p);
    if (ll) {
      this._pos = { lat: ll.lat(), lng: ll.lng() };
    }
  }
}

function MockPlaceAutocompleteElement(this: any) {
  const el = document.createElement('div') as any;
  const handlers: Record<string, Function[]> = {};
  el.addEventListener = (ev: string, cb: any) => {
    if (!handlers[ev]) handlers[ev] = [];
    handlers[ev].push(cb);
  };
  el.removeEventListener = () => {};
  el.__triggerSelect = (placePrediction: any) => {
    (handlers['gmp-select'] || []).forEach((cb) => cb({ placePrediction }));
  };
  (globalThis as any).__lastPlaceAutocomplete = el;
  return el;
}

(global as any).google = {
  maps: {
    Map: MockMap as any,
    Marker: MockMarker as any,
    MapMouseEvent: class {},
    places: {
      PlaceAutocompleteElement: MockPlaceAutocompleteElement as any,
    },
  },
};
