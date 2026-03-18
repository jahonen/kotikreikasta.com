import type { Metadata } from "next";
import NavBar from '../../components/nav-bar';
import Footer from '../../components/Footer';
import ListingCard from '../../components/ListingCard';
import { getFirestore } from '../../lib/firebase-admin-server';
import { Listing } from '../../types/listing';
import './listings.scss';

export const metadata: Metadata = {
  title: 'Kohteet - Kotikreikasta',
  description: 'Valikoituja kiinteistökohteita Kreikasta. Löydä unelmiesi koti auringon maasta.',
};

export const revalidate = 3600;

async function getListings(): Promise<Listing[]> {
  try {
    const db = await getFirestore();
    const snapshot = await db.collection('listings')
      .where('status', '==', 'published')
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get();
    
    return snapshot.docs.map((doc) => {
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
    });
  } catch (error) {
    console.error('[LISTINGS_PAGE] Error fetching listings:', error);
    return [];
  }
}

export default async function ListingsPage() {
  const listings = await getListings();

  return (
    <div className="listings-page">
      <NavBar />
      <main className="listings-main">
        <div className="listings-header container">
          <div className="listings-header-left">
            <div className="listings-eyebrow">Kohteet</div>
            <h1 className="listings-title">Valikoituja kohteita <em>Kreikasta</em></h1>
          </div>
          <div className="listings-count">{listings.length} kohdetta</div>
        </div>

        <div className="listings-content container">
          {listings.length === 0 ? (
            <div className="listings-empty">
              <p>Ei julkaistuja kohteita juuri nyt.</p>
            </div>
          ) : (
            <div className="listings-grid">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
