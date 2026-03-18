import Link from "next/link";
import { Listing } from "../types/listing";
import "./ListingCard.scss";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const priceFormatted = new Intl.NumberFormat('fi-FI', { 
    style: 'currency', 
    currency: 'EUR', 
    minimumFractionDigits: 0 
  }).format(listing.price);
  
  const pricePerSqmFormatted = new Intl.NumberFormat('fi-FI', { 
    style: 'currency', 
    currency: 'EUR', 
    minimumFractionDigits: 0 
  }).format(listing.pricePerSqm);
  
  const highlightAmenities = ['Vuoristonäköala', 'Merinäköala', 'Puutarha', 'Takka', 'Uima-allas'];
  const topAmenities = listing.attributes.amenitiesList?.slice(0, 6) || [];
  const nearbyTop = listing.nearbyPois?.slice(0, 4) || [];
  
  return (
    <Link href={`/listings/${listing.urlStub}`} className="listing-card">
      <div className="card-image-wrap">
        {listing.media.featured?.url ? (
          <img
            src={listing.media.featured.url}
            alt={listing.title}
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
          <div className="card-price">{priceFormatted}</div>
          <div className="card-price-per-sqm">{pricePerSqmFormatted} / m²</div>
        </div>

        {listing.attributes.condition && (
          <div className="card-condition">{listing.attributes.condition} kunto</div>
        )}
      </div>

      <div className="card-body">
        <div className="card-location">
          <span className="card-location-dot"></span>
          {listing.location.locality}
          {listing.location.administrative_area_level_1 && ` · ${listing.location.administrative_area_level_1}`}
        </div>

        <div className="card-title">{listing.title}</div>

        <div className="card-specs">
          <div className="card-spec">
            <div className="card-spec-value">{listing.attributes.bedrooms}</div>
            <div className="card-spec-label">Makuuh.</div>
          </div>
          <div className="card-spec">
            <div className="card-spec-value">{listing.attributes.bathrooms}</div>
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

        {topAmenities.length > 0 && (
          <div className="card-amenities">
            {topAmenities.map((amenity, idx) => (
              <span 
                key={idx} 
                className={`amenity-tag ${highlightAmenities.includes(amenity) ? 'highlight' : ''}`}
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        {nearbyTop.length > 0 && (
          <div className="card-nearby">
            <div className="card-nearby-label">Lähellä</div>
            <div className="card-nearby-items">
              {nearbyTop.map((poi, idx) => (
                <span key={idx} className="card-nearby-item">{poi.name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="card-meta">
          <div className="card-meta-left">
            {listing.location.locality}
          </div>
          <div className="card-cta">
            KATSO KOHDE →
          </div>
        </div>
      </div>
    </Link>
  );
}
