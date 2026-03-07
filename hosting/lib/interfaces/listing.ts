export interface GeoLocation {
  address?: string;
  region?: string;
  lat?: number;
  lng?: number;
}

export interface MediaItem {
  url: string;
  alt?: string;
  type?: 'image' | 'video';
}

export interface TaxInfo {
  [key: string]: unknown;
}

export interface ConciergeInfo {
  [key: string]: unknown;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  summary?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  price?: number;
  location?: GeoLocation;
  propertyType?: string;
  media?: MediaItem[];
  amenities?: string[];
  status?: string;
  urlStub: string;
  taxInfo?: TaxInfo;
  conciergeInfo?: ConciergeInfo;
  createdAt?: any;
  updatedAt?: any;
}
