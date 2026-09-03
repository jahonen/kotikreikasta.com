export interface ListingLocation {
  coordinates: {
    lat: number;
    lng: number;
  };
  country: string;
  formatted_address: string;
  locality: string;
  postal_code: string;
  route: string;
  street_address: string;
  street_number?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  administrative_area_level_3?: string;
  administrative_area_level_4?: string;
}

export interface NearbyPoi {
  name: string;
  place_id: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export interface ListingAttributes {
  bedrooms: number;
  bathrooms: number;
  condition: string;
  heating?: string;
  amenitiesList?: string[];
  appliancesList?: string[];
}

export interface ImageCrops {
  '16:9'?: { full: string; og: string; thumbnail: string };
  '4:3'?:  { full: string; og: string; thumbnail: string };
  '1:1'?:  { full: string; og: string; thumbnail: string };
  '3:4'?:  { full: string; og: string; thumbnail: string };
  '9:16'?: { full: string; og: string; thumbnail: string };
}

export interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
  sortOrder: number;
  crops?: ImageCrops;
}

export type VideoProvider = 'youtube' | 'vimeo' | 'upload';

export interface VideoItem {
  type: VideoProvider;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder: number;
}

export interface ListingMedia {
  featured?: {
    url: string;
    alt?: string;
    crops?: ImageCrops;
  };
  gallery?: GalleryItem[];
  videos?: VideoItem[];
  streetViewUrl?: string;
}

export interface Listing {
  id: string;
  title: string;
  urlStub: string;
  type: string;
  price: number;
  pricePerSqm: number;
  size: number;
  lotSize?: number;
  yearBuilt?: number;
  status: string;
  location: ListingLocation;
  attributes: ListingAttributes;
  media: ListingMedia;
  nearbyPois?: NearbyPoi[];
  createdAt?: any;
  updatedAt?: any;
}
