import type { Metadata } from "next";
import NavBar from "../../components/nav-bar";
import Footer from "../../components/Footer";
import ListingCard, { Listing } from "../../components/ListingCard";
import { getFirestore } from "../../lib/firebase-admin-server";
import "./kohteet.scss";

export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: "Kohteet — Kotikreikasta",
  description: "Valikoituja kiinteistöjä Kreikasta. Omakotitaloja, huviloita ja asuntoja suoraan Kreikan kiinteistömarkkinoilta.",
  keywords: "Kreikka, kiinteistöt, asunnot, omakotitalot, huvilat, myytävät kohteet",
  openGraph: {
    title: "Kohteet — Kotikreikasta",
    description: "Valikoituja kiinteistöjä Kreikasta. Omakotitaloja, huviloita ja asuntoja suoraan Kreikan kiinteistömarkkinoilta.",
    url: "https://kotikreikasta.com/kohteet",
    siteName: "Kotikreikasta",
    locale: "fi_FI",
    type: "website",
  },
  alternates: {
    canonical: "https://kotikreikasta.com/kohteet",
  },
};

async function getPublishedListings(): Promise<Listing[]> {
  try {
    const db = await getFirestore();
    const snapshot = await db
      .collection('listings')
      .where('status', '==', 'published')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        urlStub: data.urlStub || doc.id,
        type: data.type || 'Kiinteistö',
        price: data.price || 0,
        pricePerSqm: data.pricePerSqm || 0,
        size: data.size || 0,
        lotSize: data.lotSize || 0,
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        yearBuilt: data.yearBuilt || undefined,
        location: {
          locality: data.location?.locality,
          administrative_area_level_2: data.location?.administrative_area_level_2,
          administrative_area_level_3: data.location?.administrative_area_level_3,
          street_address: data.location?.street_address,
          postal_code: data.location?.postal_code,
          formatted_address: data.location?.formatted_address,
        },
        attributes: {
          condition: data.attributes?.condition,
          amenitiesList: data.attributes?.amenitiesList || [],
          heating: data.attributes?.heating,
        },
        media: {
          featured: data.media?.featured,
        },
        nearbyPois: data.nearbyPois || [],
        status: data.status,
      };
    });
  } catch (error) {
    console.error('[KOHTEET_PAGE] Error fetching listings:', error);
    return [];
  }
}

export default async function KohteetPage() {
  const listings = await getPublishedListings();

  // Get unique regions for filters
  const regions = Array.from(
    new Set(
      listings
        .map((l) => l.location.administrative_area_level_2)
        .filter(Boolean)
    )
  ).slice(0, 5);

  return (
    <>
      <NavBar />
      <main className="kohteet-page">
        <div className="kohteet-container">
          <div className="kohteet-header">
            <div className="kohteet-header-left">
              <div className="kohteet-eyebrow">Kohteet</div>
              <h1 className="kohteet-title-h1">
                Valikoituja kohteita <em>Kreikasta</em>
              </h1>
            </div>
            <div className="kohteet-count">
              {listings.length} {listings.length === 1 ? 'kohde' : 'kohdetta'}
            </div>
          </div>

          {regions.length > 0 && (
            <div className="kohteet-filters">
              <div className="filter-btn active">Kaikki</div>
              {regions.map((region) => (
                <div key={region} className="filter-btn">
                  {region}
                </div>
              ))}
            </div>
          )}

          {listings.length === 0 ? (
            <div className="kohteet-empty">
              <p>Kohteita ei löytynyt. Palaa pian takaisin!</p>
            </div>
          ) : (
            <div className="kohteet-grid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
