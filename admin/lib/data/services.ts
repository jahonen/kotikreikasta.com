// Utilities to load and search home-owner services list

export interface HomeOwnerServiceName {
  greek?: string;
  english?: string;
  finnish?: string;
}
export interface HomeOwnerService {
  id: number;
  name: HomeOwnerServiceName;
}

let cache: HomeOwnerService[] | null = null;

function stripDiacritics(s: string): string {
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return s;
  }
}

function canon(s: string): string {
  return stripDiacritics(String(s || '')).toLocaleLowerCase('fi');
}

export async function fetchHomeOwnerServices(): Promise<HomeOwnerService[]> {
  if (cache) return cache;
  const urls = [
    '/assets/home-owner-services.json',
    'https://kotikreikasta.com/assets/home-owner-services.json',
    'https://kotikreikasta.web.app/assets/home-owner-services.json',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const data = await r.json();
      const arr: HomeOwnerService[] = Array.isArray(data?.services) ? data.services : [];
      cache = arr;
      return arr;
    } catch {}
  }
  return [];
}

export function searchServices(services: HomeOwnerService[], query: string): HomeOwnerService[] {
  const q = canon(query);
  if (!q) return services;
  return services.filter((s) => {
    const fn = canon(s?.name?.finnish || '');
    const en = canon(s?.name?.english || '');
    const gr = canon(s?.name?.greek || '');
    return fn.includes(q) || en.includes(q) || gr.includes(q);
  });
}
