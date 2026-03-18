import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import ContactForm from "../../../components/ContactForm";
import ListingMap from "../../../components/ListingMap";
import { getFirestore } from "../../../lib/firebase-admin-server";
import { Listing } from "../../../types/listing";
import "./listing-detail.scss";

export const revalidate = 3600;
export const dynamicParams = true;

async function getListing(slug: string): Promise<Listing | null> {
  try {
    const db = await getFirestore();
    const snapshot = await db.collection('listings')
      .where('urlStub', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      title: data.title || '',
      urlStub: data.urlStub || doc.id,
      type: data.type || '',
      price: data.price || 0,
      pricePerSqm: data.pricePerSqm || 0,
      size: data.size || 0,
      lotSize: data.lotSize,
      yearBuilt: data.yearBuilt,
      status: data.status || 'published',
      location: data.location || {},
      attributes: {
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        condition: data.attributes?.condition || data.condition,
        heating: data.attributes?.heating || data.heating,
        amenitiesList: data.attributes?.amenitiesList || data.amenitiesList || [],
        appliancesList: data.attributes?.appliancesList || data.appliancesList || [],
      },
      media: data.media || {},
      nearbyPois: data.nearbyPois || [],
      createdAt: data.createdAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || null,
    };
  } catch (error) {
    console.error('[LISTING_PAGE] Error fetching listing:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  
  if (!listing) {
    return {
      title: 'Kohdetta ei löytynyt - Kotikreikasta',
      description: 'Etsimääsi kohdetta ei löytynyt.',
    };
  }
  
  const priceFormatted = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(listing.price);
  const description = `${listing.type} ${listing.location.locality ? `kohteessa ${listing.location.locality}` : ''}. ${listing.attributes.bedrooms} makuuhuonetta, ${listing.attributes.bathrooms} kylpyhuonetta, ${listing.size} m². Hinta: ${priceFormatted}.`;
  
  return {
    title: `${listing.title} - ${listing.location.locality || 'Kreikka'} - Kotikreikasta`,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.media.featured?.url ? [listing.media.featured.url] : [],
      type: 'website',
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  
  if (!listing) {
    return (
      <div className="listing-not-found">
        <NavBar />
        <main className="container" style={{ padding: '80px 32px', textAlign: 'center' }}>
          <h1>Kohdetta ei löytynyt</h1>
          <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
            Etsimääsi kohdetta ei löytynyt tai se on poistettu myynnistä.
          </p>
          <Link href="/listings" style={{ display: 'inline-block', marginTop: '32px', padding: '12px 32px', background: 'var(--gold)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            Palaa kohteisiin
          </Link>
        </main>
        <Footer />
      </div>
    );
  }
  
  const priceFormatted = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(listing.price);
  const pricePerSqmFormatted = new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(listing.pricePerSqm);
  
  const highlightAmenities = ['Vuoristonäköala', 'Merinäköala', 'Puutarha', 'Takka', 'Uima-allas'];
  
  return (
    <div className="listing-detail-page">
      <NavBar />
      
      <main className="listing-detail-main">
        <div className="listing-hero">
          {listing.media.featured?.url && (
            <div className="listing-hero-image">
              <img src={listing.media.featured.url} alt={listing.title} />
              <div className="listing-hero-overlay">
                <div className="listing-hero-content container">
                  <div className="listing-hero-badges">
                    <span className="listing-type-badge">{listing.type}</span>
                    {listing.attributes.condition && (
                      <span className="listing-condition-badge">{listing.attributes.condition} kunto</span>
                    )}
                  </div>
                  <h1 className="listing-hero-title">{listing.title}</h1>
                  <div className="listing-hero-location">
                    <span className="location-dot"></span>
                    {listing.location.locality}
                    {listing.location.administrative_area_level_1 && ` · ${listing.location.administrative_area_level_1}`}
                  </div>
                  <div className="listing-hero-price">
                    <div className="price-main">{priceFormatted}</div>
                    <div className="price-per-sqm">{pricePerSqmFormatted} / m²</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="listing-content container">
          <div className="listing-specs-grid">
            <div className="spec-item">
              <div className="spec-value">{listing.attributes.bedrooms}</div>
              <div className="spec-label">Makuuhuonetta</div>
            </div>
            <div className="spec-item">
              <div className="spec-value">{listing.attributes.bathrooms}</div>
              <div className="spec-label">Kylpyhuonetta</div>
            </div>
            <div className="spec-item">
              <div className="spec-value">{listing.size}</div>
              <div className="spec-label">m² asuin</div>
            </div>
            {listing.lotSize && (
              <div className="spec-item">
                <div className="spec-value">{listing.lotSize}</div>
                <div className="spec-label">m² tontti</div>
              </div>
            )}
            {listing.yearBuilt && (
              <div className="spec-item">
                <div className="spec-value">{listing.yearBuilt}</div>
                <div className="spec-label">Rakennettu</div>
              </div>
            )}
          </div>
          
          {(listing.attributes.amenitiesList || listing.attributes.appliancesList) && (
            <div className="listing-amenities">
              <h2 className="section-title">Ominaisuudet</h2>
              <div className="amenities-grid">
                {listing.attributes.amenitiesList?.map((amenity, idx) => (
                  <span 
                    key={idx} 
                    className={`amenity-tag ${highlightAmenities.includes(amenity) ? 'highlight' : ''}`}
                  >
                    {amenity}
                  </span>
                ))}
                {listing.attributes.appliancesList?.map((appliance, idx) => (
                  <span key={`app-${idx}`} className="amenity-tag">
                    {appliance}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {listing.nearbyPois && listing.nearbyPois.length > 0 && (
            <div className="listing-nearby">
              <h2 className="section-title">Lähipalvelut</h2>
              <div className="nearby-grid">
                {listing.nearbyPois.slice(0, 12).map((poi, idx) => (
                  <div key={idx} className="nearby-item">
                    <span className="nearby-icon">📍</span>
                    <span className="nearby-name">{poi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="listing-location-section">
            <h2 className="section-title">Sijainti</h2>
            <div className="location-details">
              <p className="location-city">
                {listing.location.locality}
                {listing.location.administrative_area_level_1 && `, ${listing.location.administrative_area_level_1}`}
              </p>
            </div>
            {listing.location.coordinates?.lat && listing.location.coordinates?.lng && (
              <div style={{ marginTop: '24px' }}>
                <ListingMap 
                  lat={listing.location.coordinates.lat} 
                  lng={listing.location.coordinates.lng} 
                />
              </div>
            )}
          </div>
          
          <div className="listing-contact-section">
            <h2 className="section-title">Kiinnostuitko kohteesta?</h2>
            <p className="contact-intro">
              Jätä yhteystietosi, niin otamme sinuun yhteyttä ja kerromme lisää tästä kohteesta.
            </p>
            <ContactForm 
              source={{
                type: 'listing',
                listingId: listing.id,
                title: listing.title,
                url: `/listings/${listing.urlStub}`,
                price: listing.price,
              }}
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
