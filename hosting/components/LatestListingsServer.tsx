import { getFirestore } from "../lib/firebase-admin-server";
import { Listing } from "../types/listing";
import ListingCard from "./ListingCard";

interface LatestListingsServerProps {
  count?: number;
}

async function getLatestListings(count: number): Promise<Listing[]> {
  try {
    const db = await getFirestore();
    const snapshot = await db.collection('listings')
      .where('status', '==', 'published')
      .orderBy('updatedAt', 'desc')
      .limit(count)
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
        attributes: data.attributes || {},
        media: data.media || {},
        nearbyPois: data.nearbyPois || [],
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      };
    });
  } catch (error) {
    console.error('[LATEST_LISTINGS_SERVER] Error fetching listings:', error);
    return [];
  }
}

export default async function LatestListingsServer({ count = 3 }: LatestListingsServerProps) {
  const listings = await getLatestListings(count);

  if (listings.length === 0) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Ei julkaistuja kohteita juuri nyt.</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
      gap: '24px',
      marginTop: '32px'
    }}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
