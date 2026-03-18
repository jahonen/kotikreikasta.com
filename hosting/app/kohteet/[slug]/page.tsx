import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "../../../components/nav-bar";
import Footer from "../../../components/Footer";
import ContactForm from "../../../components/ContactForm";
import { getFirestore } from "../../../lib/firebase-admin-server";
import "./listing-detail.scss";

export const revalidate = 3600;

// Generate static params for all published listings
export async function generateStaticParams() {
  try {
    const db = await getFirestore();
    const snapshot = await db
      .collection('listings')
      .where('status', '==', 'published')
      .get();
    
    return snapshot.docs.map((doc) => ({
      slug: doc.data().urlStub || doc.id,
    }));
  } catch (error) {
    console.error('[LISTING_STATIC_PARAMS] Error:', error);
    return [];
  }
}

async function getListing(slug: string): Promise<any | null> {
  try {
    const db = await getFirestore();
    
    // Try by urlStub first
    const snapshot = await db
      .collection('listings')
      .where('urlStub', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as any;
    }
    
    // Try by document ID
    const docRef = await db.collection('listings').doc(slug).get();
    if (docRef.exists && docRef.data()?.status === 'published') {
      return {
        id: docRef.id,
        ...docRef.data(),
      } as any;
    }
    
    return null;
  } catch (error) {
    console.error('[LISTING_PAGE] Error fetching listing:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  const url = `https://kotikreikasta.com/kohteet/${encodeURIComponent(slug)}`;
  
  if (!listing) {
    return {
      title: `Kohde — Kotikreikasta`,
      alternates: { canonical: url },
    };
  }

  const title = `${listing.title} — Kotikreikasta`;
  const description = `${listing.type} ${listing.location?.locality || 'Kreikassa'}. ${listing.bedrooms} makuuhuonetta, ${listing.bathrooms} kylpyhuonetta, ${listing.size} m². Hinta: €${(listing.price / 1000).toFixed(0)} 000.`;
  const imageUrl = listing.media?.featured?.url || 'https://kotikreikasta.com/og-image.jpg';

  return {
    title,
    description,
    keywords: `${listing.location?.locality}, ${listing.location?.administrative_area_level_2}, Kreikka, kiinteistö, ${listing.type}`,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Kotikreikasta',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
      locale: 'fi_FI',
      type: 'website',
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  const url = `https://kotikreikasta.com/kohteet/${encodeURIComponent(slug)}`;

  if (!listing) {
    return (
      <>
        <NavBar />
        <main className="listing-detail-page">
          <div className="listing-detail-container">
            <h1>Kohdetta ei löytynyt</h1>
            <p>Valitettavasti etsimääsi kohdetta ei löytynyt.</p>
            <p><Link href="/kohteet">Palaa kohteisiin</Link></p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const formatPrice = (price: number) => `€${(price / 1000).toFixed(0)} 000`;
  const locationText = [
    listing.location?.locality,
    listing.location?.administrative_area_level_2,
  ].filter(Boolean).join(', ');

  return (
    <>
      <NavBar />
      <main className="listing-detail-page">
        <div className="listing-detail-container">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb" className="breadcrumb">
            <ol>
              <li><Link href="/">Etusivu</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/kohteet">Kohteet</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{listing.title}</li>
            </ol>
          </nav>

          {/* Hero Image */}
          {listing.media?.featured?.url && (
            <div className="listing-hero-image">
              <img
                src={listing.media.featured.url}
                alt={listing.media.featured.alt || listing.title}
              />
            </div>
          )}

          {/* Header */}
          <div className="listing-header">
            <div className="listing-header-left">
              <div className="listing-type-badge">{listing.type}</div>
              <h1 className="listing-title">{listing.title}</h1>
              <div className="listing-location">
                <span className="location-dot"></span>
                {locationText}
              </div>
            </div>
            <div className="listing-price-block">
              <div className="listing-price">{formatPrice(listing.price)}</div>
              <div className="listing-price-per-sqm">
                €{listing.pricePerSqm?.toLocaleString('fi-FI')} / m²
              </div>
            </div>
          </div>

          {/* Key Specs */}
          <div className="listing-specs-row">
            <div className="spec-item">
              <div className="spec-value">{listing.bedrooms}</div>
              <div className="spec-label">Makuuhuonetta</div>
            </div>
            <div className="spec-item">
              <div className="spec-value">{listing.bathrooms}</div>
              <div className="spec-label">Kylpyhuonetta</div>
            </div>
            <div className="spec-item">
              <div className="spec-value">{listing.size}</div>
              <div className="spec-label">m² asuinpinta-ala</div>
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
                <div className="spec-label">Rakennusvuosi</div>
              </div>
            )}
            {listing.attributes?.condition && (
              <div className="spec-item">
                <div className="spec-value">{listing.attributes.condition}</div>
                <div className="spec-label">Kunto</div>
              </div>
            )}
          </div>

          {/* Amenities */}
          {listing.attributes?.amenitiesList && listing.attributes.amenitiesList.length > 0 && (
            <div className="listing-section">
              <h2>Ominaisuudet</h2>
              <div className="amenities-list">
                {listing.attributes.amenitiesList.map((amenity: string, idx: number) => (
                  <span key={idx} className="amenity-badge">{amenity}</span>
                ))}
              </div>
            </div>
          )}

          {/* Nearby POIs */}
          {listing.nearbyPois && listing.nearbyPois.length > 0 && (
            <div className="listing-section">
              <h2>Lähipalvelut</h2>
              <div className="nearby-list">
                {listing.nearbyPois.slice(0, 10).map((poi: any, idx: number) => (
                  <div key={idx} className="nearby-item">
                    <span className="nearby-name">{poi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {listing.location?.formatted_address && (
            <div className="listing-section">
              <h2>Sijainti</h2>
              <p className="location-address">{listing.location.formatted_address}</p>
            </div>
          )}

          {/* Contact Form */}
          <div className="listing-section">
            <h2>Ota yhteyttä</h2>
            <p className="contact-intro">
              Kiinnostuitko kohteesta? Jätä yhteystietosi ja viestisi – palaamme sinulle pian.
            </p>
            <ContactForm
              source={{
                type: 'listing',
                listingId: listing.id,
                title: listing.title,
                url,
                price: listing.price,
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
