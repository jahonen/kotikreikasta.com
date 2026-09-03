import type { MetadataRoute } from "next";
import { getFirestore } from "../lib/firebase-admin-server";

export const dynamic = 'force-dynamic';

const BASE_URL = "https://kotikreikasta.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/ostoprosessi`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/alueet`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/tasmahaku`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/konsierge`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/listings`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/synergates`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/palveluehdot`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Fetch all published blog posts from Firestore
  try {
    const db = await getFirestore();
    const snapshot = await db.collection('blog_posts')
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();

    const blogEntries: MetadataRoute.Sitemap = snapshot.docs.map((doc) => {
      const data = doc.data();
      const urlStub = data.urlStub || '';
      const publishedAt = data.publishedAt?.toDate?.() || now;
      const updatedAt = data.updatedAt?.toDate?.() || publishedAt;
      
      return {
        url: `${BASE_URL}/blog/${urlStub}`,
        lastModified: updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      };
    }).filter(entry => entry.url.includes('/blog/'));

    return [...baseEntries, ...blogEntries];
  } catch (error) {
    console.error('[SITEMAP] Error fetching blog posts:', error);
    return baseEntries;
  }
}
