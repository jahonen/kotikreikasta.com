import Link from "next/link";
import "./ListingCard.scss";

export interface Listing {
  id: string;
  title: string;
  urlStub?: string;
  type: string;
  price: number;
  pricePerSqm: number;
  size: number;
  lotSize?: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  location: {
    locality?: string;
    administrative_area_level_2?: string;
    administrative_area_level_3?: string;
    street_address?: string;
    postal_code?: string;
    formatted_address?: string;
  };
  attributes?: {
    condition?: string;
    amenitiesList?: string[];
    heating?: string;
  };
  media?: {
    featured?: {
      url: string;
      alt?: string;
    };
  };
  nearbyPois?: Array<{
    name: string;
    types: string[];
  }>;
  status?: string;
}

interface ListingCardProps {
  listing: Listing;
  featured?: boolean;
  onClick?: () => void;
}

const HIGHLIGHT_AMENITIES = [
  'Vuoristonäköala',
  'Merinäköala',
  'Puutarha',
  'Takka',
  'Uima-allas',
  'Sauna'
];

const AMENITY_ICONS: Record<string, string> = {
  'Vuoristonäköala': '🏔',
  'Merinäköala': '🌊',
  'Puutarha': '🌿',
  'Takka': '🔥',
  'Uima-allas': '🏊',
  'Sauna': '🧖',
  'Parveke': '🪴',
  'Terassi': '☀️',
};

const POI_TYPE_MAP: Record<string, string> = {
  'restaurant': 'Ravintola',
  'hotel': 'Hotelli',
  'supermarket': 'Market',
  'grocery_store': 'Market',
  'cafe': 'Kahvila',
  'bar': 'Baari',
  'beach': 'Ranta',
  'marina': 'Venesatama',
  'transit_station': 'Venesatama',
  'church': 'Kirkko',
  'pharmacy': 'Apteekki',
  'hospital': 'Sairaala',
  'school': 'Koulu',
};

function formatPrice(price: number): string {
  return `€${(price / 1000).toFixed(0)} 000`;
}

function formatPricePerSqm(pricePerSqm: number): string {
  return `€${pricePerSqm.toLocaleString('fi-FI')} / m²`;
}

function getConditionText(condition?: string): string {
  if (!condition) return '';
  const conditionMap: Record<string, string> = {
    'Erinomainen': 'Erinomainen kunto',
    'Hyvä': 'Hyvä kunto',
    'Tyydyttävä': 'Tyydyttävä kunto',
    'Huono': 'Huono kunto',
  };
  return conditionMap[condition] || condition;
}

function getPrimaryPOIType(types: string[]): string {
  for (const type of types) {
    if (POI_TYPE_MAP[type]) {
      return POI_TYPE_MAP[type];
    }
  }
  return '';
}

function formatNearbyPOIs(pois?: Array<{ name: string; types: string[] }>): Array<{ name: string; type: string }> {
  if (!pois || pois.length === 0) return [];
  
  return pois
    .slice(0, 4)
    .map(poi => ({
      name: poi.name,
      type: getPrimaryPOIType(poi.types),
    }))
    .filter(poi => poi.type);
}

export default function ListingCard({ listing, featured = false, onClick }: ListingCardProps) {
  const href = `/kohteet/${listing.urlStub || listing.id}`;
  const location = listing.location;
  const locationText = [location.locality, location.administrative_area_level_2]
    .filter(Boolean)
    .join(' · ');
  
  const amenities = listing.attributes?.amenitiesList || [];
  const highlightedAmenities = amenities.filter(a => HIGHLIGHT_AMENITIES.includes(a));
  const regularAmenities = amenities.filter(a => !HIGHLIGHT_AMENITIES.includes(a));
  
  const nearbyPOIs = formatNearbyPOIs(listing.nearbyPois);
  const condition = listing.attributes?.condition;

  const CardContent = (
    <div className={`listing-card ${featured ? 'featured' : ''}`}>
      <div className="card-image-wrap">
        {listing.media?.featured?.url ? (
          <img
            src={listing.media.featured.url}
            alt={listing.media.featured.alt || listing.title}
            loading="lazy"
          />
        ) : (
          <div className="card-image-placeholder" />
        )}
        <div className="card-image-overlay"></div>

        <div className="card-badges-top">
          <div className="card-type-badge">{listing.type}</div>
        </div>

        <div className="card-price-block">
          <div className="card-price">{formatPrice(listing.price)}</div>
          <div className="card-price-per-sqm">{formatPricePerSqm(listing.pricePerSqm)}</div>
        </div>

        {condition && (
          <div className="card-condition">{getConditionText(condition)}</div>
        )}
      </div>

      <div className="card-body">
        <div className="card-location">
          <span className="card-location-dot"></span>
          {locationText}
        </div>

        <div className="card-title">{listing.title}</div>

        <div className="card-specs">
          <div className="card-spec">
            <div className="card-spec-value">{listing.bedrooms}</div>
            <div className="card-spec-label">Makuuh.</div>
          </div>
          <div className="card-spec">
            <div className="card-spec-value">{listing.bathrooms}</div>
            <div className="card-spec-label">Kylpyh.</div>
          </div>
          <div className="card-spec">
            <div className="card-spec-value">{listing.size}</div>
            <div className="card-spec-label">m² asuin</div>
          </div>
          {listing.lotSize && (
            <div className="card-spec">
              <div className="card-spec-value">{listing.lotSize}</div>
              <div className="card-spec-label">m² tontti</div>
            </div>
          )}
          {listing.yearBuilt && (
            <div className="card-spec">
              <div className="card-spec-value">{listing.yearBuilt}</div>
              <div className="card-spec-label">Rakennettu</div>
            </div>
          )}
        </div>

        {amenities.length > 0 && (
          <div className="card-amenities">
            {highlightedAmenities.map((amenity, idx) => (
              <span key={idx} className="amenity-tag highlight">
                {AMENITY_ICONS[amenity] ? `${AMENITY_ICONS[amenity]} ` : ''}{amenity}
              </span>
            ))}
            {regularAmenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} className="amenity-tag">
                {amenity}
              </span>
            ))}
          </div>
        )}

        {nearbyPOIs.length > 0 && (
          <div className="card-nearby">
            <div className="card-nearby-label">Lähellä</div>
            <div className="card-nearby-items">
              {nearbyPOIs.map((poi, idx) => (
                <span key={idx} className="card-nearby-item">
                  {poi.type} {poi.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="card-meta">
          <div className="card-meta-left">
            {location.street_address && location.postal_code
              ? `${location.street_address} · ${location.postal_code}`
              : location.formatted_address || ''}
          </div>
          <button className="card-cta" onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick();
            }
          }}>
            KATSO KOHDE →
          </button>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick} style={{ cursor: 'pointer' }}>{CardContent}</div>;
  }

  return <Link href={href}>{CardContent}</Link>;
}
