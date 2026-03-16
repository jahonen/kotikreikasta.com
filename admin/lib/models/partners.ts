// Data models for persons, partner organizations, and business locations
// Lifecycle tag: alpha

export type PersonRole = 'partner' | 'customer' | 'stakeholder';

export interface Person {
  // required
  id: string; // document id
  displayName: string;
  role: PersonRole; // logical role for access/segmentation
  status: 'active' | 'inactive';
  // optional contact
  email?: string | null;
  phone?: string | null;
  title?: string | null; // e.g. Agent, Owner
  organizationId?: string | null; // reference to organizations/{id}
  // meta
  notes?: string | null;
  tags?: string[]; // free-form labels
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export type PartnerCategory =
  | 'real_estate_agent'
  | 'accountant'
  | 'gardener'
  | 'electrician'
  | 'plumber'
  | 'general_contractor'
  | 'cleaning'
  | 'property_management'
  | 'legal'
  | 'other';

export interface OrganizationLocationAddress {
  formatted?: string | null;
  country?: string | null;
  administrativeAreaLevel1?: string | null; // Perifereia
  administrativeAreaLevel2?: string | null; // Perifereiakí Enótita
  administrativeAreaLevel3?: string | null; // Dímos
  locality?: string | null;
  route?: string | null;
  streetNumber?: string | null;
  postalCode?: string | null;
}

export interface OrganizationLocation {
  id: string; // subcollection doc id
  lat: number;
  lng: number;
  address?: OrganizationLocationAddress;
  label?: string | null; // e.g., Headquarters, Branch
  phone?: string | null;
  email?: string | null;
  url?: string | null; // google maps place url or website for this branch
  createdAt?: any;
  updatedAt?: any;
}

export interface Organization {
  id: string; // document id
  displayName: string; // public name
  legalName?: string | null;
  status: 'active' | 'inactive' | 'archived';
  categories: PartnerCategory[]; // legacy categories (kept for compatibility)
  serviceIds?: number[]; // IDs from home-owner-services.json
  descriptionMd?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null; // storage or external
  primaryLocationId?: string | null;
  // denormalized snapshot of primary location for list views
  primaryLocation?: {
    lat: number;
    lng: number;
    city?: string | null;
    a1?: string | null; // region
    a2?: string | null; // prefecture
  } | null;
  tags?: string[];
  notes?: string | null; // internal only
  createdAt?: any;
  updatedAt?: any;
}

export function normalizeAddressComponents(acs?: Array<{ types: string[]; longText?: string; shortText?: string }>): OrganizationLocationAddress {
  const pick = (t: string) => acs?.find((c) => c.types?.includes(t))?.longText || null;
  return {
    country: pick('country'),
    administrativeAreaLevel1: pick('administrative_area_level_1'),
    administrativeAreaLevel2: pick('administrative_area_level_2'),
    administrativeAreaLevel3: pick('administrative_area_level_3'),
    locality: pick('locality') || pick('sublocality') || pick('postal_town') || null,
    route: pick('route'),
    streetNumber: pick('street_number'),
    postalCode: pick('postal_code'),
  };
}
